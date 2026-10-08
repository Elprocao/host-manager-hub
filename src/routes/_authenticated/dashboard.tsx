import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Server, Network } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SOFTWARE, isAgentOnline, serversQuery } from "@/lib/servers";
import { ROLE_LABEL } from "@/lib/permissions";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Mis servidores — BlockHost" },
      { name: "description", content: "Tus servidores de Minecraft y los que compartes con otros." },
      { property: "og:title", content: "Mis servidores — BlockHost" },
      { property: "og:description", content: "Tus servidores de Minecraft y los compartidos contigo." },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(serversQuery),
  component: Dashboard,
});

function Dashboard() {
  const { data: servers } = useSuspenseQuery(serversQuery);
  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="mx-auto max-w-6xl px-4 py-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Mis servidores</h1>
            <p className="mt-1 text-muted-foreground">Los tuyos y los que otros han compartido contigo.</p>
          </div>
          <CreateServerDialog />
        </div>

        {servers.length === 0 ? (
          <div className="mt-10 rounded-xl border border-dashed border-border p-12 text-center">
            <p className="font-display text-sm text-primary">Aún no hay nada</p>
            <p className="mt-2 text-muted-foreground">Crea tu primer servidor para empezar.</p>
          </div>
        ) : (
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {servers.map((s) => {
              const online = isAgentOnline(s.agent_last_seen);
              return (
                <Link
                  key={s.id}
                  to="/servers/$id"
                  params={{ id: s.id }}
                  className="group rounded-lg border border-border bg-card p-5 shadow-block transition-transform hover:-translate-y-0.5"
                >
                  <div className="flex items-start justify-between">
                    {s.kind === "proxy" ? (
                      <Network className="size-6 text-primary" />
                    ) : (
                      <Server className="size-6 text-primary" />
                    )}
                    <Badge variant={s.role === "owner" ? "default" : "secondary"}>{ROLE_LABEL[s.role]}</Badge>
                  </div>
                  <h2 className="mt-4 text-lg font-semibold">{s.name}</h2>
                  <p className="text-sm capitalize text-muted-foreground">
                    {s.kind === "proxy" ? "Proxy" : "Servidor"} · {s.software}
                    {s.kind === "server" ? ` ${s.mc_version}` : ""}
                  </p>
                  <div className="mt-4 flex items-center gap-2 text-xs">
                    <span className={`size-2 rounded-full ${online ? "bg-success" : "bg-muted-foreground"}`} />
                    <span className="text-muted-foreground">
                      {online ? (s.status === "running" ? "En marcha" : "PC conectado") : "PC desconectado"}
                    </span>
                  </div>
                  {s.role !== "owner" && s.owner_email && (
                    <p className="mt-2 text-xs text-muted-foreground">de {s.owner_email}</p>
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

function CreateServerDialog() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [kind, setKind] = useState<"server" | "proxy">("server");
  const [software, setSoftware] = useState("paper");
  const [version, setVersion] = useState("1.21.1");
  const [ram, setRam] = useState("2048");
  const [busy, setBusy] = useState(false);
  const qc = useQueryClient();
  const navigate = useNavigate();

  function chooseKind(k: "server" | "proxy") {
    setKind(k);
    setSoftware(SOFTWARE[k][0].value);
    setRam(k === "proxy" ? "512" : "2048");
  }

  async function create() {
    if (!name.trim()) return toast.error("Ponle un nombre");
    setBusy(true);
    const { data: u } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from("servers")
      .insert({
        owner_id: u.user!.id,
        owner_email: u.user!.email ?? null,
        name: name.trim().slice(0, 48),
        kind,
        software,
        mc_version: version.trim(),
        ram_mb: Number(ram),
      })
      .select("id")
      .single();
    setBusy(false);
    if (error || !data) return toast.error("No se pudo crear. Revisa la versión y la RAM.");
    await qc.invalidateQueries({ queryKey: ["servers"] });
    setOpen(false);
    navigate({ to: "/servers/$id", params: { id: data.id } });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="shadow-block">
          <Plus /> Nuevo servidor
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nuevo servidor</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid grid-cols-2 gap-2">
            {(["server", "proxy"] as const).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => chooseKind(k)}
                className={`rounded-lg border p-4 text-left transition-colors ${
                  kind === k ? "border-primary bg-accent" : "border-border hover:bg-muted"
                }`}
              >
                {k === "server" ? <Server className="size-5 text-primary" /> : <Network className="size-5 text-primary" />}
                <p className="mt-2 font-semibold">{k === "server" ? "Servidor" : "Proxy"}</p>
                <p className="text-xs text-muted-foreground">
                  {k === "server" ? "Un mundo donde se juega" : "Redirige a tus otros servidores"}
                </p>
              </button>
            ))}
          </div>
          <div className="grid gap-2">
            <Label>Nombre</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={48} placeholder="Survival con amigos" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label>Software</Label>
              <Select value={software} onValueChange={setSoftware}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SOFTWARE[kind].map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>RAM (MB)</Label>
              <Input type="number" min={512} max={32768} step={512} value={ram} onChange={(e) => setRam(e.target.value)} />
            </div>
          </div>
          {kind === "server" && (
            <div className="grid gap-2">
              <Label>Versión de Minecraft</Label>
              <Input value={version} onChange={(e) => setVersion(e.target.value)} placeholder="1.21.1" />
            </div>
          )}
          <Button onClick={create} disabled={busy}>{busy ? "Creando…" : "Crear servidor"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
