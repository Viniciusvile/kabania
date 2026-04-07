-- ============================================
-- TESTE DE EMERGÊNCIA: Liberar Acesso Geral (SLA)
-- ============================================

-- 1. Desabilitar RLS temporariamente para provar que o código de frontend está OK
ALTER TABLE public.contracts DISABLE ROW LEVEL SECURITY;

-- 2. Garantir que o usuário autenticado possa fazer tudo (backup se RLS estiver ligada)
DROP POLICY IF EXISTS "contracts_full_access" ON public.contracts;
CREATE POLICY "contracts_full_access" ON public.contracts
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- 3. Limpeza de políticas anteriores que podem estar travando
DROP POLICY IF EXISTS "contracts_select_v3" ON public.contracts;
DROP POLICY IF EXISTS "contracts_insert_v3" ON public.contracts;
DROP POLICY IF EXISTS "contracts_update_v3" ON public.contracts;
DROP POLICY IF EXISTS "contracts_delete_v3" ON public.contracts;

-- 4. Garantir Grants
GRANT ALL ON public.contracts TO authenticated;
GRANT ALL ON public.contracts TO anon;
GRANT ALL ON public.contracts TO service_role;
