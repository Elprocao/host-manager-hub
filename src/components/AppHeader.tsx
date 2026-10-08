import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2">
      <span className="grid size-7 place-items-center rounded-sm bg-primary shadow-block">
        <span className="size-3 bg-primary-foreground" />
      </span>
      <span className="font-display text-lg text-foreground">BlockHost</span>
    </Link>
  );
}

export function AppHeader() {
  const [email, setEmail] = useState<string | null>(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
  }, []);

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <header className="border-b border-border bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <Logo />
          <Link
            to="/dashboard"
            className="text-sm text-muted-foreground hover:text-foreground"
            activeProps={{ className: "text-foreground" }}
          >
            Mis servidores
          </Link>
        </div>
        <div className="flex items-center gap-3">
          {email && <span className="hidden text-sm text-muted-foreground sm:inline">{email}</span>}
          <Button variant="ghost" size="sm" onClick={signOut}>
            <LogOut /> Salir
          </Button>
        </div>
      </div>
    </header>
  );
}
