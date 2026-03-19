-- ============================================================================
-- FIX: Definitivo para Persistência e Segurança de Escalas (RLS v4)
-- ============================================================================
-- Este script resolve o problema de "Tempo limite" e "Permissão negada" 
-- ao mover escalas, utilizando a função otimizada de acesso por empresa.
-- Execute este script no SQL Editor do Supabase.

-- 1. Garantir que a função de acesso existe (Performance O(1))
CREATE OR REPLACE FUNCTION public.check_company_access(target_company_id TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE (id::text = auth.uid()::text OR user_id::text = auth.uid()::text)
    AND company_id = target_company_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Atualizar Políticas de Escalas (SHIFTS)
ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view company shifts" ON public.shifts;
CREATE POLICY "Users can view company shifts" ON public.shifts
    FOR SELECT TO authenticated USING ( check_company_access(company_id) );

DROP POLICY IF EXISTS "Users can manage company shifts" ON public.shifts;
CREATE POLICY "Users can manage company shifts" ON public.shifts
    FOR ALL TO authenticated USING ( check_company_access(company_id) );

-- 3. Atualizar Políticas de Designações (ASSIGNMENTS)
ALTER TABLE public.shift_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view shift assignments" ON public.shift_assignments;
CREATE POLICY "Users can view shift assignments" ON public.shift_assignments
    FOR SELECT TO authenticated USING (
        EXISTS (SELECT 1 FROM public.shifts s WHERE s.id = shift_assignments.shift_id AND check_company_access(s.company_id))
    );

DROP POLICY IF EXISTS "Admins can manage shift assignments" ON public.shift_assignments;
CREATE POLICY "Admins can manage shift assignments" ON public.shift_assignments
    FOR ALL TO authenticated USING (
        EXISTS (SELECT 1 FROM public.shifts s WHERE s.id = shift_assignments.shift_id AND check_company_access(s.company_id))
    );

-- 4. Atualizar Políticas de Chamados (CALLS)
ALTER TABLE public.shift_calls ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view shift calls" ON public.shift_calls;
CREATE POLICY "Users can view shift calls" ON public.shift_calls
    FOR SELECT TO authenticated USING ( check_company_access(company_id) );

DROP POLICY IF EXISTS "Users can manage shift calls" ON public.shift_calls;
CREATE POLICY "Users can manage shift calls" ON public.shift_calls
    FOR ALL TO authenticated USING ( check_company_access(company_id) );

-- 5. Otimização de Índices (Garante que a função check_company_access seja rápida)
CREATE INDEX IF NOT EXISTS idx_shifts_multi_tenant ON public.shifts(company_id, id);
CREATE INDEX IF NOT EXISTS idx_shift_assignments_shift_id ON public.shift_assignments(shift_id);
CREATE INDEX IF NOT EXISTS idx_shift_calls_company_id ON public.shift_calls(company_id);

ANALYZE public.shifts;
ANALYZE public.shift_assignments;
ANALYZE public.shift_calls;
