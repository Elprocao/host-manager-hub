-- Permite guardar varias versiones compatibles separadas por comas.

ALTER TABLE public.servers DROP CONSTRAINT IF EXISTS servers_mc_version_check;
ALTER TABLE public.servers ADD CONSTRAINT servers_mc_version_check CHECK (mc_version ~ '^[0-9]+\.[0-9]+(\.[0-9]+)?(,[0-9]+\.[0-9]+(\.[0-9]+)?)*$');

-- La creación solo queda permitida al usuario autenticado que se declara propietario.
DROP POLICY IF EXISTS "create own servers" ON public.servers;
CREATE POLICY "create own servers" ON public.servers
  FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid());
