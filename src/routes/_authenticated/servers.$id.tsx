import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { AppHeader } from "@/components/AppHeader";
import { serverQuery, isAgentOnline } from "@/lib/servers";
import { ROLE_LABEL } from "@/lib/permissions";

export const Route = createFileRoute("/_authenticated/servers/$id")({
  head: () => ({
    meta: [
      { title: "Servidor — BlockHost" },
      { name: "description", content: "Panel de control de tu servidor de Minecraft." },
      { property: "og:title", content: "Servidor — BlockHost" },
      { property: "og:description", content: "Panel de control de tu servidor de Minecraft." },
    ],
  }),
  loader: ({ context, params }) => context.queryClient.ensureQueryData(serverQuery(params.id)),
  component: ServerPage,
});

function ServerPage() {
  const { id } = Route.useParams();
  const { data } = useSuspenseQuery(serverQuery(id));
  if (!data) {
    return (
      <div className="min-h-screen">
        <AppHeader />
        <main className="mx-auto max-w-6xl px-4 py-10">
          <p>No tienes acceso a este servidor.</p>
          <Link to="/dashboard" className="text-primary">Volver</Link>
        </main>
      </div>
    );
  }
  const { server, role } = data;
  const online = isAgentOnline(server.agent_last_seen);
  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="mx-auto max-w-6xl px-4 py-10">
        <h1 className="text-3xl font-bold">{server.name}</h1>
        <p className="mt-1 text-muted-foreground">
          {server.kind === "proxy" ? "Proxy" : "Servidor"} · {server.software} · {ROLE_LABEL[role]}
        </p>
        <p className="mt-4 text-sm">{online ? "PC conectado" : "PC desconectado"}</p>
        <pre className="mt-6 max-h-96 overflow-auto rounded-lg bg-console p-4 font-mono text-xs text-console-foreground">
          {server.console_tail || "Sin salida de consola todavía."}
        </pre>
      </main>
    </div>
  );
}
