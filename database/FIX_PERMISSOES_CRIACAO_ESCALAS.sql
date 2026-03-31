-- ============================================================================
-- FIX: RESOLUÇÃO DE CONFLITO DE TIPOS (UUID vs TEXT) - VERSÃO ROBUSTA
--=============================================================================
-- Este script corrige o erro de "operator does not exist: uuid = text".

-- 1. Função move_shift_rpc com conversão explícita (CAST ::text)
CREATE OR REPLACE FUNCTION public.move_shift_rpc(
    p_shift_id UUID,
    p_start_time TIMESTAMPTZ,
    p_end_time TIMESTAMPTZ
)
RETURNS JSON AS $$
BEGIN
    UPDATE public.shifts s
    SET 
        start_time = p_start_time,
        end_time = p_end_time,
        updated_at = now()
    WHERE s.id = p_shift_id
    AND s.company_id::text = (
        SELECT company_id::text FROM public.profiles 
        -- Forçamos conversão em ambos os lados para garantir compatibilidade
        WHERE (id::text = auth.uid()::text OR user_id::text = auth.uid()::text)
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

-- 2. Política de RLS Unitária com CASTs de Segurança
DROP POLICY IF EXISTS "Unified manage company shifts" ON public.shifts;

CREATE POLICY "Unified manage company shifts" ON public.shifts
    FOR ALL TO authenticated 
    USING (
        company_id::text IN (
            SELECT company_id::text FROM public.profiles 
            WHERE (id::text = auth.uid()::text OR user_id::text = auth.uid()::text)
        )
    )
    WITH CHECK (
        company_id::text IN (
            SELECT company_id::text FROM public.profiles 
            WHERE (id::text = auth.uid()::text OR user_id::text = auth.uid()::text)
        )
    );

-- 3. Índices de performance para as buscas castadas (opcional, melhora velocidade)
CREATE INDEX IF NOT EXISTS idx_profiles_company_text ON public.profiles ((company_id::text));
CREATE INDEX IF NOT EXISTS idx_shifts_company_text ON public.shifts ((company_id::text));
