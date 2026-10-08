import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useState } from "react";
import { File, Folder, FolderOpen, HardDrive, Play, RefreshCw, Save, Square, Terminal, Upload } from "lucide-react";
import { toast } from "sonner";
import { AppHeader } from "@/components/AppHeader";
import { serverQuery, isAgentOnline } from "@/lib/servers";
import { ROLE_LABEL } from "@/lib/permissions";

export const Route = createFileRoute("/_authenticated/servers/$id")({
  head: () => ({
    meta: [
      { title: "Servidor — BlockHost" },
      { name: "description", content: "Panel seguro de control de tu servidor de Minecraft." },
      { property: "og:title", content: "Servidor — BlockHost" },
      { property: "og:description", content: "Gestiona archivos dentro de la carpeta elegida y conecta tu ayudante local." },
    ],
  }),
  loader: ({ context, params }) => context.queryClient.ensureQueryData(serverQuery(params.id)),
  component: ServerPage,
});

type AnyHandle = any;
type Entry = { name: string; path: string; kind: "file" | "directory"; handle: AnyHandle };

const protectedFiles = new Set(["start.bat", "start.sh"]);
function safePath(value: string) {
  const normalized = value.replaceAll("\\", "/").trim();
  if (!normalized || normalized.startsWith("/") || normalized.includes("\0") || normalized.includes(":")) throw new Error("Ruta inválida");
  const parts = normalized.split("/").filter(Boolean);
  if (parts.some((part) => part === ".." || part === "." || /[<>|?*\x00-\x1f]/.test(part) || /[. ]$/.test(part))) throw new Error("Ruta fuera de la carpeta permitida");
  return parts.join("/");
}
function canEdit(role: string) { return role === "owner" || role === "admin" || role === "editor"; }
function canRun(role: string) { return role === "owner" || role === "admin"; }

async function scanDirectory(handle: AnyHandle, parent = ""): Promise<Entry[]> {
  const result: Entry[] = [];
  for await (const [name, child] of handle.entries()) {
    const path = safePath(parent ? `${parent}/${name}` : name);
    result.push({ name, path, kind: child.kind, handle: child });
    if (child.kind === "directory") result.push(...(await scanDirectory(child, path)));
  }
  return result.sort((a, b) => a.path.localeCompare(b.path));
}

function ServerPage() {
  const { id } = Route.useParams();
  const { data } = useSuspenseQuery(serverQuery(id));
  if (!data) return <NoAccess />;
  return <ServerWorkspace id={id} data={data} />;
}

function NoAccess() {
  return <div className="min-h-screen"><AppHeader /><main className="mx-auto max-w-6xl px-4 py-10"><p>No tienes acceso a este servidor.</p><Link to="/dashboard" className="text-primary">Volver al dashboard</Link></main></div>;
}

function ServerWorkspace({ id, data }: { id: string; data: NonNullable<Awaited<ReturnType<typeof serverQuery>["queryFn"]>> }) {
  const { server, role } = data;
  const online = isAgentOnline(server.agent_last_seen);
  const [root, setRoot] = useState<AnyHandle>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [selected, setSelected] = useState<Entry | null>(null);
  const [content, setContent] = useState("");
  const [dirty, setDirty] = useState(false);
  const [helperUrl, setHelperUrl] = useState("http://127.0.0.1:8787");
  const [helperOnline, setHelperOnline] = useState(false);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async (handle = root) => {
    if (!handle) return;
    try { setEntries(await scanDirectory(handle)); } catch { toast.error("No se pudo leer la carpeta elegida"); }
  }, [root]);

  async function chooseFolder() {
    try {
      const picker = (window as any).showDirectoryPicker;
      if (!picker) { toast.error("Usa Chrome o Edge para elegir una carpeta"); return; }
      const handle = await picker({ mode: canEdit(role) ? "readwrite" : "read" });
      setRoot(handle); setSelected(null); setContent(""); await refresh(handle);
      toast.success(`Carpeta conectada: ${handle.name}`);
    } catch (error: any) { if (error?.name !== "AbortError") toast.error("No se pudo conectar la carpeta"); }
  }

  async function openFile(entry: Entry) {
    if (entry.kind !== "file") return;
    try { setSelected(entry); setContent(await (await entry.handle.getFile()).text()); setDirty(false); }
    catch { toast.error("No se pudo abrir el archivo"); }
  }

  async function saveFile() {
    if (!selected || selected.kind !== "file" || !canEdit(role)) return;
    try {
      safePath(selected.path);
      if (protectedFiles.has(selected.path)) { toast.error("El archivo de arranque está protegido"); return; }
      const writable = await selected.handle.createWritable(); await writable.write(content); await writable.close(); setDirty(false); toast.success("Archivo guardado"); await refresh();
    } catch { toast.error("No se pudo guardar el archivo"); }
  }

  async function checkHelper() {
    setBusy(true);
    try { const response = await fetch(`${helperUrl.replace(/\/$/, "")}/health`, { signal: AbortSignal.timeout(2500) }); setHelperOnline(response.ok); toast[response.ok ? "success" : "error"](response.ok ? "Ayudante conectado" : "El ayudante respondió con error"); }
    catch { setHelperOnline(false); toast.error("Ayudante desconectado"); }
    finally { setBusy(false); }
  }

  async function helperAction(action: "start" | "stop") {
    if (!helperOnline || !canRun(role)) return;
    setBusy(true);
    try { const response = await fetch(`${helperUrl.replace(/\/$/, "")}/v1/servers/${encodeURIComponent(id)}/${action}`, { method: "POST", headers: { "content-type": "application/json" } }); if (!response.ok) throw new Error(); toast.success(action === "start" ? "Orden de arranque enviada" : "Orden de parada enviada"); }
    catch { toast.error("El ayudante rechazó la orden o no está disponible"); }
    finally { setBusy(false); }
  }

  useEffect(() => { if (root) void refresh(root); }, [root, refresh]);
  const visible = entries.filter((entry) => !selected || entry.path.startsWith(selected.path.split("/").slice(0, -1).join("/")));

  return <div className="min-h-screen"><AppHeader /><main className="mx-auto max-w-6xl px-4 py-8">
    <div className="flex flex-wrap items-start justify-between gap-4"><div><Link to="/dashboard" className="text-sm text-primary">← Mis servidores</Link><h1 className="mt-2 text-3xl font-bold">{server.name}</h1><p className="mt-1 text-muted-foreground">{server.kind === "proxy" ? "Proxy" : "Servidor"} · {server.software}{server.kind === "server" ? ` · Minecraft ${server.mc_version}` : ""} · {ROLE_LABEL[role]}</p></div><div className="flex items-center gap-2"><span className={`size-2 rounded-full ${online ? "bg-success" : "bg-muted-foreground"}`} />{online ? "PC conectado" : "PC desconectado"}</div></div>
    <section className="mt-6 grid gap-4 lg:grid-cols-[280px_1fr]">
      <aside className="space-y-4">
        <div className="rounded-xl border border-border bg-card p-4"><div className="flex items-center gap-2 font-semibold"><HardDrive className="size-5 text-primary" /> Carpeta del host</div><p className="mt-2 text-sm text-muted-foreground">Solo se podrá leer y escribir dentro de la carpeta que selecciones aquí.</p><button onClick={chooseFolder} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"><FolderOpen className="size-4" />{root ? "Cambiar carpeta" : "Elegir carpeta"}</button>{root && <p className="mt-2 truncate text-xs text-muted-foreground">{root.name}</p>}</div>
        <div className="rounded-xl border border-border bg-card p-4"><div className="flex items-center gap-2 font-semibold"><Terminal className="size-5 text-primary" /> Ayudante local</div><p className="mt-2 text-sm text-muted-foreground">Necesario para iniciar o detener Paper. La web no ejecuta programas en tu PC por sí sola.</p><input value={helperUrl} onChange={(e) => setHelperUrl(e.target.value)} className="mt-3 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" aria-label="URL del ayudante" /><button onClick={checkHelper} disabled={busy} className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-md border border-border px-3 py-2 text-sm">{busy ? "Comprobando…" : <><RefreshCw className="size-4" /> Comprobar conexión</>}</button><p className={`mt-2 text-xs ${helperOnline ? "text-success" : "text-muted-foreground"}`}>{helperOnline ? "Conectado y listo" : "No conectado"}</p><div className="mt-3 grid grid-cols-2 gap-2"><button disabled={!helperOnline || !canRun(role) || busy} onClick={() => helperAction("start")} className="inline-flex items-center justify-center gap-1 rounded-md bg-primary px-2 py-2 text-xs font-medium text-primary-foreground disabled:opacity-40"><Play className="size-3" /> Iniciar</button><button disabled={!helperOnline || !canRun(role) || busy} onClick={() => helperAction("stop")} className="inline-flex items-center justify-center gap-1 rounded-md border border-border px-2 py-2 text-xs disabled:opacity-40"><Square className="size-3" /> Detener</button></div></div>
      </aside>
      <div className="grid gap-4 xl:grid-cols-[280px_1fr]"><div className="rounded-xl border border-border bg-card p-4"><div className="flex items-center justify-between"><h2 className="font-semibold">Archivos</h2><button onClick={() => refresh()} disabled={!root} aria-label="Actualizar archivos"><RefreshCw className="size-4" /></button></div>{!root ? <p className="mt-6 text-sm text-muted-foreground">Elige la carpeta del servidor para ver sus archivos.</p> : visible.length === 0 ? <p className="mt-6 text-sm text-muted-foreground">La carpeta está vacía.</p> : <div className="mt-3 max-h-[520px] space-y-1 overflow-auto">{visible.map((entry) => <button key={entry.path} onClick={() => openFile(entry)} className={`flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm hover:bg-muted ${selected?.path === entry.path ? "bg-muted" : ""}`}>{entry.kind === "directory" ? <Folder className="size-4 text-primary" /> : <File className="size-4 text-muted-foreground" />}<span className="truncate">{entry.path}</span></button>)}</div>}</div><div className="rounded-xl border border-border bg-card p-4"><div className="flex items-center justify-between"><h2 className="font-semibold">Editor</h2><button onClick={saveFile} disabled={!selected || !dirty || !canEdit(role)} className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-40"><Save className="size-4" /> Guardar</button></div>{selected ? <><p className="mt-2 truncate text-xs text-muted-foreground">{selected.path}{protectedFiles.has(selected.path) ? " · protegido" : ""}</p><textarea value={content} onChange={(e) => { setContent(e.target.value); setDirty(true); }} readOnly={!canEdit(role) || protectedFiles.has(selected.path)} className="mt-3 min-h-[440px] w-full resize-y rounded-md border border-input bg-console p-3 font-mono text-xs text-console-foreground" spellCheck={false} /></> : <div className="flex min-h-[480px] flex-col items-center justify-center text-center text-muted-foreground"><Upload className="size-8" /><p className="mt-3 text-sm">Selecciona un archivo de texto para editarlo.</p></div>}</div></div>
    </section><p className="mt-5 text-xs text-muted-foreground">Seguridad: las rutas se normalizan y se rechazan segmentos peligrosos; el navegador no concede acceso fuera de la carpeta seleccionada. No subas secretos ni archivos de credenciales.</p>
    <pre className="mt-6 max-h-48 overflow-auto rounded-lg bg-console p-4 font-mono text-xs text-console-foreground">{server.console_tail || "Sin salida de consola todavía."}</pre>
  </main></div>;
}
