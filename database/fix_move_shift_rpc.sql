-- ============================================================================
-- FIX: RPC para mover escalas sem problemas de RLS/PostgREST
-- Execute este script no SQL Editor do Supabase
-- ============================================================================

-- Função que realiza o UPDATE com SECURITY DEFINER (bypassa RLS)
-- e valida acesso por company_id internamente.
CREATE OR REPLACE FUNCTION public.move_shift_rpc(
    p_shift_id UUID,
    p_start_time TIMESTAMPTZ,
    p_end_time TIMESTAMPTZ
)
RETURNS JSON AS $$
DECLARE
    v_company_id TEXT;
    v_has_access BOOLEAN;
BEGIN
    -- Buscar company_id do shift
    SELECT company_id INTO v_company_id
    FROM public.shifts
    WHERE id = p_shift_id;

    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'Escala não encontrada');
    END IF;

    -- Validar acesso do usuário à empresa
    SELECT EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE (id::text = auth.uid()::text OR user_id::text = auth.uid()::text)
        AND company_id = v_company_id
    ) INTO v_has_access;

    IF NOT v_has_access THEN
        RETURN json_build_object('success', false, 'error', 'Acesso negado');
    END IF;

    -- Executar o UPDATE
    UPDATE public.shifts
    SET 
        start_time = p_start_time,
        end_time = p_end_time,
        updated_at = now()
    WHERE id = p_shift_id;

    RETURN json_build_object('success', true, 'shift_id', p_shift_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Conceder acesso para usuários autenticados
GRANT EXECUTE ON FUNCTION public.move_shift_rpc(UUID, TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;

-- Também corrigir RLS da tabela shifts para garantir UPDATE
DROP POLICY IF EXISTS "Users can manage company shifts" ON public.shifts;
CREATE POLICY "Users can manage company shifts" ON public.shifts
    FOR ALL TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE (id::text = auth.uid()::text OR user_id::text = auth.uid()::text)
            AND company_id = shifts.company_id
        )
    ) WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE (id::text = auth.uid()::text OR user_id::text = auth.uid()::text)
            AND company_id = shifts.company_id
        )
    );

-- Garantir que UPDATE em shifts é permitido
DROP POLICY IF EXISTS "Users can view company shifts" ON public.shifts;
CREATE POLICY "Users can view company shifts" ON public.shifts
    FOR SELECT TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE (id::text = auth.uid()::text OR user_id::text = auth.uid()::text)
            AND company_id = shifts.company_id
        )
    );
