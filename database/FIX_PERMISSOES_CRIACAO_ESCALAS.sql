-- ============================================================================
-- FIX: DESTRAVAR CRIAÇÃO DE ESCALAS (RESOLUÇÃO DE VIOLAÇÃO DE RLS)
--=============================================================================
-- Execute este script no SQL Editor para permitir a criação de novas escalas.

-- 1. Otimizar a função move_shift_rpc com Identidade Redundante
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
    AND s.company_id = (
        SELECT company_id FROM public.profiles 
        -- Identidade Redundante: Checa ID (UUID) ou user_id (Legacy/Text)
        WHERE (id = auth.uid() OR user_id = auth.uid()::text)
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

-- 2. Corrigir Política de RLS para ser Redundante e permitir INSERT
-- Removemos as políticas antigas para evitar sobreposição
DROP POLICY IF EXISTS "Users can view company shifts" ON public.shifts;
DROP POLICY IF EXISTS "Users can manage company shifts" ON public.shifts;

-- Criamos uma única política robusta para todas as operações (CRUD)
CREATE POLICY "Unified manage company shifts" ON public.shifts
    FOR ALL TO authenticated 
    USING (
        company_id IN (
            SELECT company_id FROM public.profiles 
            WHERE (id = auth.uid() OR user_id = auth.uid()::text)
        )
    )
    WITH CHECK (
        company_id IN (
            SELECT company_id FROM public.profiles 
            WHERE (id = auth.uid() OR user_id = auth.uid()::text)
        )
    );

-- 3. Garantir que as tabelas acessadas pelo sub-query tenham índices para velocidade
CREATE INDEX IF NOT EXISTS idx_profiles_auth_linked ON public.profiles(id, user_id);
