import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { sha256Hex } from "@/lib/token-hash";

const Body = z.object({
  status: z.enum(["offline", "starting", "running", "stopping"]),
  console: z.string().max(20000).default(""),
  results: z
    .array(
      z.object({
        id: z.string().uuid(),
        ok: z.boolean(),
        result: z.unknown().optional(),
        error: z.string().max(2000).optional(),
      }),
    )
    .max(50)
    .default([]),
});

const MAX_RESULT_CHARS = 12_000_000; // ~8MB file as base64

export const Route = createFileRoute("/api/public/agent/sync")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = request.headers.get("authorization") ?? "";
        const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
        if (!/^mca_[0-9a-f]{64}$/.test(token)) {
          return Response.json({ error: "unauthorized" }, { status: 401 });
        }
        let body: z.infer<typeof Body>;
        try {
          body = Body.parse(await request.json());
        } catch {
          return Response.json({ error: "bad request" }, { status: 400 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const hash = await sha256Hex(token);
        const { data: agent } = await supabaseAdmin
          .from("server_agents")
          .select("server_id")
          .eq("token_hash", hash)
          .maybeSingle();
        if (!agent) return Response.json({ error: "unauthorized" }, { status: 401 });
        const serverId = agent.server_id;

        // 1. Store results — only for commands of THIS server that are running.
        for (const r of body.results) {
          let result = r.result ?? null;
          let error = r.ok ? null : (r.error ?? "Error");
          if (result !== null && JSON.stringify(result).length > MAX_RESULT_CHARS) {
            result = null;
            error = "Resultado demasiado grande";
          }
          await supabaseAdmin
            .from("commands")
            .update({
              status: error ? "error" : "done",
              result: result as never,
              error,
              completed_at: new Date().toISOString(),
            })
            .eq("id", r.id)
            .eq("server_id", serverId)
            .eq("status", "running");
        }

        // 2. Heartbeat + console
        const { data: srv } = await supabaseAdmin
          .from("servers")
          .update({
            status: body.status,
            console_tail: body.console.slice(-16000),
            agent_last_seen: new Date().toISOString(),
          })
          .eq("id", serverId)
          .select("name, kind, software, mc_version, ram_mb")
          .single();

        // 3. Clean old commands (file contents should not linger)
        await supabaseAdmin
          .from("commands")
          .delete()
          .eq("server_id", serverId)
          .lt("created_at", new Date(Date.now() - 30 * 60_000).toISOString());

        // 4. Hand out pending commands (expire ones older than 60s)
        await supabaseAdmin
          .from("commands")
          .update({ status: "error", error: "Caducado", completed_at: new Date().toISOString() })
          .eq("server_id", serverId)
          .eq("status", "pending")
          .lt("created_at", new Date(Date.now() - 60_000).toISOString());

        const { data: pending } = await supabaseAdmin
          .from("commands")
          .select("id, type, payload")
          .eq("server_id", serverId)
          .eq("status", "pending")
          .order("created_at", { ascending: true })
          .limit(10);
        const ids = (pending ?? []).map((c) => c.id);
        if (ids.length) {
          await supabaseAdmin
            .from("commands")
            .update({ status: "running" })
            .in("id", ids)
            .eq("status", "pending");
        }

        return Response.json(
          { config: srv, commands: pending ?? [] },
          { headers: { "Cache-Control": "no-store" } },
        );
      },
    },
  },
});
