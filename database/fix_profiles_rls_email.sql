-- ============================================================================
-- 🛡️ REPARO: SEGURANÇA DE PERFIS E VALIDAÇÃO POR EMAIL (RLS)
-- ============================================================================
-- Este script corrige a política RLS central de perfis (`profiles`)
-- para evitar o travamento ("chicken-and-egg") onde o usuário não consegue
-- acessar nem vincular seu próprio perfil quando `user_id` é nulo.
--
-- Execute este script INTEGRALMENTE no SQL Editor do seu Supabase.
-- ============================================================================

-- 1. Refatorar a Função Mestra de Acesso (check_company_access)
-- Permite validar o acesso do usuário pela correspondência do e-mail autenticado (JWT).
CREATE OR REPLACE FUNCTION public.check_company_access(target_company_id TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  IF target_company_id IS NULL THEN RETURN FALSE; END IF;
  
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE (id::text = auth.uid()::text OR user_id::text = auth.uid()::text OR email = auth.jwt()->>'email')
    AND company_id::text = target_company_id::text
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. Recriar Política RLS na tabela Profiles
-- Permite que usuários autenticados acessem e atualizem seu próprio perfil com base no email.
DROP POLICY IF EXISTS "RLS_Profiles" ON public.profiles;
DROP POLICY IF EXISTS "Profiles Isolation" ON public.profiles;

CREATE POLICY "RLS_Profiles" ON public.profiles FOR ALL TO authenticated 
    USING (user_id::text = auth.uid()::text OR email = auth.jwt()->>'email')
    WITH CHECK (user_id::text = auth.uid()::text OR email = auth.jwt()->>'email');

-- Notifica o PostgREST para recarregar o esquema
NOTIFY pgrst, 'reload schema';
