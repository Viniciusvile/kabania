-- ============================================================================
-- 🛡️ REPARO MESTRE: SEGURANÇA UNIVERSAL KABANIA (RLS)
--=============================================================================
-- Este script corrige a função central de segurança para aceitar IDs redundantes.

-- 1. Refatorar a Função Mestra de Acesso
-- Esta função é usada por TODAS as tabelas do sistema para isolamento de dados.
CREATE OR REPLACE FUNCTION public.check_company_access(target_company_id TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  IF target_company_id IS NULL THEN RETURN FALSE; END IF;
  
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    -- Mudança Crítica: Verifica ID (UUID) OU user_id (Texto) contra o auth.uid()
    WHERE (id::text = auth.uid()::text OR user_id::text = auth.uid()::text)
    AND company_id::text = target_company_id::text
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. Corrigir RLS da Tabela de Atribuições (Shift Assignments)
-- Garante que membros (não apenas admins) possam gerenciar colaboradores se tiverem acesso à empresa.
ALTER TABLE public.shift_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view shift assignments" ON public.shift_assignments;
CREATE POLICY "Users can view shift assignments" ON public.shift_assignments
    FOR SELECT TO authenticated 
    USING (
        EXISTS (
            SELECT 1 FROM public.shifts s 
            WHERE s.id = shift_assignments.shift_id 
            AND check_company_access(s.company_id)
        )
    );

DROP POLICY IF EXISTS "Members can manage shift assignments" ON public.shift_assignments;
DROP POLICY IF EXISTS "Admins can manage shift assignments" ON public.shift_assignments;

CREATE POLICY "Members can manage shift assignments" ON public.shift_assignments
    FOR ALL TO authenticated 
    USING (
        EXISTS (
            SELECT 1 FROM public.shifts s 
            WHERE s.id = shift_assignments.shift_id 
            AND check_company_access(s.company_id)
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.shifts s 
            WHERE s.id = shift_assignments.shift_id 
            AND check_company_access(s.company_id)
        )
    );

-- 3. Índices para performance instantânea nestas verificações
CREATE INDEX IF NOT EXISTS idx_sa_shift_id_lookup ON public.shift_assignments(shift_id);
CREATE INDEX IF NOT EXISTS idx_sa_employee_lookup ON public.shift_assignments(employee_id);
CREATE INDEX IF NOT EXISTS idx_sa_collaborator_lookup ON public.shift_assignments(collaborator_id);
