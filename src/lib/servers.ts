import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { ServerRole } from "@/lib/permissions";

export const SOFTWARE = {
  server: [
    { value: "paper", label: "Paper" },
    { value: "purpur", label: "Purpur" },
  ],
  proxy: [
    { value: "velocity", label: "Velocity" },
    { value: "waterfall", label: "Waterfall (BungeeCord)" },
  ],
} as const;

export function isAgentOnline(lastSeen: string | null | undefined): boolean {
  if (!lastSeen) return false;
  return Date.now() - new Date(lastSeen).getTime() < 15000;
}

async function myIdentity() {
  const { data } = await supabase.auth.getUser();
  return { id: data.user?.id ?? "", email: (data.user?.email ?? "").toLowerCase() };
}

export const serversQuery = queryOptions({
  queryKey: ["servers"],
  queryFn: async () => {
    const me = await myIdentity();
    const { data, error } = await supabase
      .from("servers")
      .select("id, name, kind, software, mc_version, status, agent_last_seen, owner_id, owner_email")
      .order("created_at", { ascending: false });
    if (error) throw error;
    const { data: mine } = await supabase
      .from("server_members")
      .select("server_id, role")
      .eq("email", me.email);
    const roles = new Map((mine ?? []).map((m) => [m.server_id, m.role as ServerRole]));
    return (data ?? []).map((s) => ({
      ...s,
      role: (s.owner_id === me.id ? "owner" : roles.get(s.id) ?? "viewer") as ServerRole,
    }));
  },
  refetchInterval: 10000,
});

export const serverQuery = (id: string) =>
  queryOptions({
    queryKey: ["server", id],
    queryFn: async () => {
      const me = await myIdentity();
      const { data, error } = await supabase.from("servers").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      if (!data) return null;
      let role: ServerRole = "viewer";
      if (data.owner_id === me.id) role = "owner";
      else {
        const { data: m } = await supabase
          .from("server_members")
          .select("role")
          .eq("server_id", id)
          .eq("email", me.email)
          .maybeSingle();
        if (m) role = m.role as ServerRole;
      }
      return { server: data, role, me };
    },
    refetchInterval: 3000,
  });

export const membersQuery = (id: string) =>
  queryOptions({
    queryKey: ["members", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("server_members")
        .select("id, email, role, created_at")
        .eq("server_id", id)
        .order("created_at");
      if (error) throw error;
      return data ?? [];
    },
  });
