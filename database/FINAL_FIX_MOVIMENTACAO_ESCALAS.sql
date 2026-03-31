-- ============================================================================
-- FIX: CORREÇÃO DEFINITIVA (V2) PARA MOVIMENTAÇÃO DE ESCALAS (DRAG & DROP)
--=============================================================================
-- Execute este script no SQL Editor para eliminar Timeouts e garantir rapidez.

-- 1. Recriar a função de movimentação OTIMIZADA (Single Query Validation)
CREATE OR REPLACE FUNCTION public.move_shift_rpc(
    p_shift_id UUID,
    p_start_time TIMESTAMPTZ,
    p_end_time TIMESTAMPTZ
)
RETURNS JSON AS $$
BEGIN
    -- Update performático usando subconsulta interna para validação de empresa
    -- Isso evita múltiplos selects e reduz latência de rede entre as camadas.
    UPDATE public.shifts s
    SET 
        start_time = p_start_time,
        end_time = p_end_time,
        updated_at = now()
    WHERE s.id = p_shift_id
    AND s.company_id = (
        SELECT company_id FROM public.profiles 
        WHERE user_id = auth.uid()
        LIMIT 1
    );

    IF FOUND THEN
        RETURN json_build_object('success', true, 'shift_id', p_shift_id);
    ELSE
        RETURN json_build_object('success', false, 'error', 'Não autorizado ou escala não encontrada');
    END IF;

EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Garantir permissões de execução
GRANT EXECUTE ON FUNCTION public.move_shift_rpc(UUID, TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;

-- 3. Corrigir a política de RLS para ser baseada em cache/index
-- A política simplificada melhora significativamente a performance de drag-and-drop
DROP POLICY IF EXISTS "Users can manage company shifts" ON public.shifts;
CREATE POLICY "Users can manage company shifts" ON public.shifts
    FOR ALL TO authenticated 
    USING (
        company_id = (
            SELECT company_id FROM public.profiles 
            WHERE user_id = auth.uid()
            LIMIT 1
        )
    )
    WITH CHECK (true);
