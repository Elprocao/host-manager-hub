import { createFileRoute, Link } from "@tanstack/react-router";
import { FolderLock, Network, Play, Users } from "lucide-react";
import hero from "@/assets/hero-island.jpg";
import { Logo } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "BlockHost — Tu servidor de Minecraft, en tu PC" },
      {
        name: "description",
        content:
          "Crea servidores y proxies de Minecraft en tu propio PC y gestiona sus archivos a distancia con tu equipo.",
      },
      { property: "og:title", content: "BlockHost — Tu servidor de Minecraft, en tu PC" },
      {
        property: "og:description",
        content: "Servidores Paper, Purpur, Velocity y Waterfall alojados en tu PC, controlados desde la web.",
      },
    ],
  }),
  component: Index,
});

const features = [
  { icon: FolderLock, title: "Una sola carpeta", text: "La web solo puede tocar la carpeta del servidor. Nada más de tu PC." },
  { icon: Network, title: "Servidor o proxy", text: "Paper y Purpur para jugar, Velocity y Waterfall para unir servidores." },
  { icon: Users, title: "Tu equipo, tus reglas", text: "Tú eres el dueño. Añade administradores, editores o lectores." },
  { icon: Play, title: "Encendido remoto", text: "Dueño y administradores encienden y apagan el servidor desde cualquier lugar." },
];

function Index() {
  return (
    <div className="min-h-screen bg-grid">
      <header className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Logo />
        <Button asChild variant="outline" size="sm">
          <Link to="/auth">Entrar</Link>
        </Button>
      </header>

      <section className="relative mx-auto grid max-w-6xl items-center gap-10 px-4 py-12 md:grid-cols-2 md:py-20">
        <div className="absolute inset-0 -z-10 bg-glow" />
        <div>
          <p className="font-display text-xs text-primary">Self-hosting sin complicaciones</p>
          <h1 className="mt-4 text-4xl font-bold leading-tight md:text-6xl">
            Tu servidor de Minecraft vive en tu PC.
            <span className="text-primary"> Lo controlas desde aquí.</span>
          </h1>
          <p className="mt-5 max-w-md text-lg text-muted-foreground">
            Elige una carpeta, crea el servidor y dale acceso a tu equipo. Mientras tu PC esté
            encendido, todo se gestiona desde la web.
          </p>
          <div className="mt-8 flex gap-3">
            <Button asChild size="lg" className="shadow-block">
              <Link to="/auth">Empezar con Google</Link>
            </Button>
          </div>
        </div>
        <img
          src={hero}
          alt="Isla de bloques con un servidor brillante"
          width={1280}
          height={960}
          className="w-full rounded-xl"
        />
      </section>

      <section className="mx-auto grid max-w-6xl gap-4 px-4 pb-24 sm:grid-cols-2 lg:grid-cols-4">
        {features.map((f) => (
          <div key={f.title} className="rounded-lg border border-border bg-card p-5 shadow-block">
            <f.icon className="size-6 text-primary" />
            <h3 className="mt-3 font-semibold">{f.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{f.text}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
