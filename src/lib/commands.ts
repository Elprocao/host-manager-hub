import { supabase } from "@/integrations/supabase/client";
import type { CommandType } from "@/lib/permissions";

export async function runCommand<T = unknown>(
  serverId: string,
  type: CommandType,
  payload: Record<string, unknown> = {},
  timeoutMs = 25000,
): Promise<T> {
  const { data, error } = await supabase
    .from("commands")
    .insert({ server_id: serverId, type, payload: payload as never })
    .select("id")
    .single();
  if (error || !data) throw new Error("No tienes permiso para hacer esto");

  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    await new Promise((r) => setTimeout(r, 700));
    const { data: row } = await supabase
      .from("commands")
      .select("status, result, error")
      .eq("id", data.id)
      .maybeSingle();
    if (!row) continue;
    if (row.status === "done") return row.result as T;
    if (row.status === "error") throw new Error(row.error ?? "Error en el PC");
  }
  throw new Error("El PC no respondió. ¿Está el agente encendido?");
}
