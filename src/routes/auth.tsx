import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Logo } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar — BlockHost" },
      { name: "description", content: "Inicia sesión con Google para gestionar tus servidores de Minecraft." },
      { property: "og:title", content: "Entrar — BlockHost" },
      { property: "og:description", content: "Inicia sesión con Google para gestionar tus servidores." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard", replace: true });
    });
    const { data } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) navigate({ to: "/dashboard", replace: true });
    });
    return () => data.subscription.unsubscribe();
  }, [navigate]);

  async function signIn() {
    setLoading(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin + "/auth",
    });
    if (result.error) {
      setLoading(false);
      toast.error("No se pudo iniciar sesión con Google");
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/dashboard", replace: true });
  }

  return (
    <div className="grid min-h-screen place-items-center bg-grid px-4">
      <div className="w-full max-w-sm rounded-xl border border-border bg-card p-8 shadow-block">
        <Logo />
        <h1 className="mt-6 text-2xl font-bold">Entra en tu panel</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Usa tu cuenta de Google. Si alguien te ha invitado a su servidor, entra con el mismo correo.
        </p>
        <Button className="mt-6 w-full" size="lg" onClick={signIn} disabled={loading}>
          {loading ? "Abriendo Google…" : "Continuar con Google"}
        </Button>
      </div>
    </div>
  );
}
