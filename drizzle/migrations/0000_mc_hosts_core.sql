CREATE TYPE public.member_role AS ENUM ('admin','editor','viewer');

CREATE TABLE public.servers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  owner_email text,
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 48),
  kind text NOT NULL CHECK (kind IN ('server','proxy')),
  software text NOT NULL CHECK (software IN ('paper','purpur','velocity','waterfall')),
  mc_version text NOT NULL DEFAULT '1.21.1' CHECK (mc_version ~ '^[0-9]+\.[0-9]+(\.[0-9]+)?$'),
  ram_mb integer NOT NULL DEFAULT 2048 CHECK (ram_mb BETWEEN 512 AND 32768),
  status text NOT NULL DEFAULT 'offline',
  agent_last_seen timestamptz,
  console_tail text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.servers TO authenticated;
GRANT ALL ON public.servers TO service_role;
ALTER TABLE public.servers ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.server_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  server_id uuid NOT NULL REFERENCES public.servers(id) ON DELETE CASCADE,
  email text NOT NULL CHECK (email = lower(email) AND email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  role public.member_role NOT NULL DEFAULT 'viewer',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (server_id, email)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.server_members TO authenticated;
GRANT ALL ON public.server_members TO service_role;
ALTER TABLE public.server_members ENABLE ROW LEVEL SECURITY;

-- Agent tokens: no client access at all (only service role).
CREATE TABLE public.server_agents (
  server_id uuid PRIMARY KEY REFERENCES public.servers(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.server_agents TO service_role;
ALTER TABLE public.server_agents ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.commands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  server_id uuid NOT NULL REFERENCES public.servers(id) ON DELETE CASCADE,
  created_by uuid NOT NULL DEFAULT auth.uid(),
  type text NOT NULL CHECK (type IN ('list','read','write','mkdir','delete','rename','setup','start','stop','console')),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending',
  result jsonb,
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);
CREATE INDEX commands_pending_idx ON public.commands (server_id, status, created_at);
GRANT SELECT, INSERT ON public.commands TO authenticated;
GRANT ALL ON public.commands TO service_role;
ALTER TABLE public.commands ENABLE ROW LEVEL SECURITY;

-- Role of the current user on a server: 'owner' | 'admin' | 'editor' | 'viewer' | NULL
CREATE OR REPLACE FUNCTION public.server_role(_server_id uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE
    WHEN EXISTS (SELECT 1 FROM public.servers s WHERE s.id = _server_id AND s.owner_id = auth.uid()) THEN 'owner'
    ELSE (SELECT m.role::text FROM public.server_members m
          WHERE m.server_id = _server_id
            AND m.email = lower(coalesce(auth.jwt() ->> 'email', ''))
            AND coalesce(auth.jwt() ->> 'email', '') <> '')
  END
$$;
REVOKE ALL ON FUNCTION public.server_role(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.server_role(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.can_issue(_server_id uuid, _type text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE public.server_role(_server_id)
    WHEN 'owner' THEN true
    WHEN 'admin' THEN true
    WHEN 'editor' THEN _type IN ('list','read','write','mkdir','delete','rename')
    WHEN 'viewer' THEN _type IN ('list','read')
    ELSE false
  END
$$;
REVOKE ALL ON FUNCTION public.can_issue(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_issue(uuid, text) TO authenticated;

-- servers policies
CREATE POLICY "members read servers" ON public.servers FOR SELECT TO authenticated
  USING (public.server_role(id) IS NOT NULL);
CREATE POLICY "create own servers" ON public.servers FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid() AND status = 'offline' AND console_tail = '' AND agent_last_seen IS NULL);
CREATE POLICY "owner deletes server" ON public.servers FOR DELETE TO authenticated
  USING (owner_id = auth.uid());
-- Owner may only edit configuration columns (enforced by column grants below)
REVOKE UPDATE ON public.servers FROM authenticated;
GRANT UPDATE (name, mc_version, ram_mb) ON public.servers TO authenticated;
CREATE POLICY "owner updates server" ON public.servers FOR UPDATE TO authenticated
  USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

-- members policies
CREATE POLICY "members read members" ON public.server_members FOR SELECT TO authenticated
  USING (public.server_role(server_id) IS NOT NULL);
CREATE POLICY "owner adds members" ON public.server_members FOR INSERT TO authenticated
  WITH CHECK (public.server_role(server_id) = 'owner');
CREATE POLICY "owner updates members" ON public.server_members FOR UPDATE TO authenticated
  USING (public.server_role(server_id) = 'owner') WITH CHECK (public.server_role(server_id) = 'owner');
CREATE POLICY "owner removes members" ON public.server_members FOR DELETE TO authenticated
  USING (public.server_role(server_id) = 'owner');

-- commands policies
CREATE POLICY "read own commands" ON public.commands FOR SELECT TO authenticated
  USING (created_by = auth.uid() AND public.server_role(server_id) IS NOT NULL);
CREATE POLICY "issue permitted commands" ON public.commands FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid() AND status = 'pending' AND result IS NULL AND error IS NULL
              AND public.can_issue(server_id, type));

ALTER PUBLICATION supabase_realtime ADD TABLE public.servers;