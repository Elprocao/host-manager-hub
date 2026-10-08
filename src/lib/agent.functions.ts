import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { sha256Hex } from "@/lib/token-hash";

// Creates (or replaces) the secret token the PC agent uses. Owner only.
export const generateAgentToken = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { serverId: string }) =>
    z.object({ serverId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: srv, error } = await context.supabase
      .from("servers")
      .select("id, owner_id")
      .eq("id", data.serverId)
      .maybeSingle();
    if (error || !srv || srv.owner_id !== context.userId) {
      throw new Error("Solo el dueño puede generar el token del agente");
    }
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    const token =
      "mca_" + Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
    const token_hash = await sha256Hex(token);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error: upErr } = await supabaseAdmin
      .from("server_agents")
      .upsert({ server_id: srv.id, token_hash, created_at: new Date().toISOString() });
    if (upErr) {
      console.error(upErr);
      throw new Error("No se pudo guardar el token");
    }
    return { token };
  });
