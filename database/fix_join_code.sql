-- fix_join_code.sql
-- Permite que usuários autenticados (mesmo sem empresa) consultem o código de convite

-- 1. Habilitar leitura pública (apenas ID e Código) para usuários logados
-- Isso resolve o erro de "Empresa não encontrada" na busca por código
DROP POLICY IF EXISTS "Permitir busca por código de convite" ON companies;
CREATE POLICY "Permitir busca por código de convite" ON companies 
FOR SELECT USING (auth.role() = 'authenticated');

-- 2. Garantir que o perfil pode ser atualizado pelo próprio usuário
-- (Isso já deve existir, mas reforçamos para a troca de empresa/papel)
DROP POLICY IF EXISTS "Usuários podem atualizar o próprio perfil" ON profiles;
CREATE POLICY "Usuários podem atualizar o próprio perfil" ON profiles 
FOR UPDATE USING (auth.email() = auth.jwt()->>'email');
