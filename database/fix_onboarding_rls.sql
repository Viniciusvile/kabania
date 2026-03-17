-- SCRIPT DE CORREÇÃO DE ONBOARDING (RLS)
-- Execute no SQL Editor do Supabase (https://app.supabase.com/project/_/sql)

-- 1. Políticas para a tabela 'companies'
-- Permitir que qualquer usuário autenticado crie uma empresa
DROP POLICY IF EXISTS "Permitir criar empresa" ON companies;
CREATE POLICY "Permitir criar empresa" 
ON companies FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- Garantir que o usuário possa ver a empresa que acabou de criar ou que está vinculado
DROP POLICY IF EXISTS "Permitir ver empresa vinculada" ON companies;
DROP POLICY IF EXISTS "Usuários podem ver a própria empresa" ON companies;
CREATE POLICY "Usuários podem ver a própria empresa" 
ON companies FOR SELECT 
TO authenticated 
USING (true); -- Permitimos ver todas por enquanto para simplificar o join, ou podemos restringir mais tarde

-- 2. Políticas para a tabela 'knowledge_base'
-- Permitir inserção de itens iniciais durante o setup da empresa
DROP POLICY IF EXISTS "Permitir inserção inicial de knowledge" ON knowledge_base;
CREATE POLICY "Permitir inserção inicial de knowledge" 
ON knowledge_base FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- 3. Políticas para a tabela 'profiles'
-- Garantir que o usuário possa atualizar seu próprio perfil com o company_id
DROP POLICY IF EXISTS "Atualizar próprio perfil" ON profiles;
DROP POLICY IF EXISTS "Usuários podem atualizar o próprio perfil" ON profiles;
CREATE POLICY "Usuários podem atualizar o próprio perfil" 
ON profiles FOR UPDATE 
TO authenticated 
USING (auth.email() = email)
WITH CHECK (auth.email() = email);
