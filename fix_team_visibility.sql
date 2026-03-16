-- fix_team_visibility.sql
-- Permite que usuários vejam outros membros da mesma empresa sem erro de recursão
-- Versão robusta que aceita busca por email ou user_id

-- 1. Criar função auxiliar para buscar a empresa do usuário atual
CREATE OR REPLACE FUNCTION public.get_auth_company_id() 
RETURNS TEXT AS $$
  SELECT company_id FROM public.profiles 
  WHERE user_id = auth.uid() 
     OR (email = auth.jwt()->>'email' AND email IS NOT NULL)
  LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- 2. Remover políticas antigas
DROP POLICY IF EXISTS "Visualização simplificada da equipe" ON profiles;
DROP POLICY IF EXISTS "Visualização de perfis da empresa" ON profiles;
DROP POLICY IF EXISTS "Usuários podem ver o próprio perfil" ON profiles;

-- 3. Criar nova política segura e sem recursão
CREATE POLICY "Visualização simplificada da equipe" ON public.profiles
FOR SELECT USING (
    user_id = auth.uid() -- Por ID
    OR (email = auth.jwt()->>'email' AND email IS NOT NULL) -- Por Email (Legado)
    OR (company_id IS NOT NULL AND company_id = public.get_auth_company_id()) -- Por Empresa
);
