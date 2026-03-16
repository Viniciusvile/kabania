-- fix_team_visibility.sql
-- Permite que usuários vejam outros membros da mesma empresa sem erro de recursão

-- 1. Criar função auxiliar para buscar a empresa do usuário atual
-- SECURITY DEFINER faz a função rodar com permissões de dono, ignorando o RLS recursivo
CREATE OR REPLACE FUNCTION public.get_auth_company_id() 
RETURNS TEXT AS $$
  SELECT company_id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- 2. Remover a política antiga causava recursão
DROP POLICY IF EXISTS "Visualização de perfis da empresa" ON profiles;
DROP POLICY IF EXISTS "Usuários podem ver o próprio perfil" ON profiles;

-- 3. Criar nova política segura e sem recursão
CREATE POLICY "Visualização simplificada da equipe" ON public.profiles
FOR SELECT USING (
    user_id = auth.uid() -- Sempre pode ver a si mesmo
    OR 
    (company_id IS NOT NULL AND company_id = public.get_auth_company_id()) -- Pode ver quem for da mesma empresa
);
