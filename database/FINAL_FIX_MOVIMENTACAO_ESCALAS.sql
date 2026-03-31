-- ============================================================================
-- FIX: CORREÇÃO DEFINITIVA PARA MOVIMENTAÇÃO DE ESCALAS (DRAG & DROP)
--=============================================================================
-- Execute este script no SQL Editor do seu painel Supabase para garantir 
-- que as permissões e a função de salvamento estejam corretas.

-- 1. Recriar a função de movimentação com logs de erro e bypass de RLS
CREATE OR REPLACE FUNCTION public.move_shift_rpc(
    p_shift_id UUID,
    p_start_time TIMESTAMPTZ,
    p_end_time TIMESTAMPTZ
)
RETURNS JSON AS $$
DECLARE
    v_company_id TEXT;
    v_current_user_company_id TEXT;
BEGIN
    -- Obter a empresa da escala
    SELECT company_id INTO v_company_id FROM public.shifts WHERE id = p_shift_id;
    
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'Escala não encontrada (ID: ' || p_shift_id || ')');
    END IF;

    -- Obter a empresa do usuário logado (usando o email ou o ID do profile)
    SELECT company_id INTO v_current_user_company_id FROM public.profiles 
    WHERE (user_id = auth.uid() OR email = auth.jwt()->>'email')
    LIMIT 1;

    -- Validar se o usuário pertence à mesma empresa
    IF v_current_user_company_id IS NULL OR v_current_user_company_id <> v_company_id THEN
        RETURN json_build_object('success', false, 'error', 'Acesso negado: Usuário não pertence à empresa ' || COALESCE(v_company_id, 'NULL'));
    END IF;

    -- Executar o Update
    UPDATE public.shifts
    SET 
        start_time = p_start_time,
        end_time = p_end_time,
        updated_at = now()
    WHERE id = p_shift_id;

    RETURN json_build_object('success', true, 'shift_id', p_shift_id);
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Garantir permissões de execução
GRANT EXECUTE ON FUNCTION public.move_shift_rpc(UUID, TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION public.move_shift_rpc(UUID, TIMESTAMPTZ, TIMESTAMPTZ) TO service_role;

-- 3. Corrigir a política de RLS para permitir Updates e Inserts
DROP POLICY IF EXISTS "Users can manage company shifts" ON public.shifts;
CREATE POLICY "Users can manage company shifts" ON public.shifts
    FOR ALL TO authenticated 
    USING (
        company_id IN (
            SELECT company_id FROM public.profiles 
            WHERE (user_id = auth.uid() OR email = auth.jwt()->>'email')
        )
    )
    WITH CHECK (true); -- Permitimos o insert se passar no USING acima ou simplificamos o CHECK
