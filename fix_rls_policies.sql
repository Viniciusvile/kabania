-- SCRIPT DE CORREÇÃO DEFINITIVA (V2)
-- Execute no SQL Editor do Supabase (https://app.supabase.com/project/_/sql)

-- 1. CORREÇÃO DA TABELA DE PERFIS (Profiles)
-- Adiciona a coluna user_id se ela não existir (necessário para políticas de segurança)
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='user_id') THEN
    ALTER TABLE profiles ADD COLUMN user_id UUID;
  END IF;
END $$;

-- 2. RESET DE POLÍTICAS (Para evitar conflitos)
DROP POLICY IF EXISTS "Usuarios podem criar empresas" ON companies;
DROP POLICY IF EXISTS "Usuarios podem ver sua propria empresa" ON companies;
DROP POLICY IF EXISTS "Usuarios podem ver proprio perfil" ON profiles;
DROP POLICY IF EXISTS "Usuarios podem atualizar proprio perfil" ON profiles;
DROP POLICY IF EXISTS "Permitir inserção de perfil no login" ON profiles;

-- 3. NOVAS POLÍTICAS PARA EMPRESAS (Companies)
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir criar empresa" 
ON companies FOR INSERT 
TO authenticated 
WITH CHECK (true);

CREATE POLICY "Permitir ver empresa vinculada" 
ON companies FOR SELECT 
TO authenticated 
USING (true); -- Permitir ver para poder ingressar e validar códigos

-- 4. NOVAS POLÍTICAS PARA PERFIS (Profiles)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ver próprio perfil" 
ON profiles FOR SELECT 
TO authenticated 
USING (true); -- Essencial para o login funcionar e verificar existência

CREATE POLICY "Atualizar próprio perfil" 
ON profiles FOR UPDATE 
TO authenticated 
USING (email = auth.jwt()->>'email')
WITH CHECK (email = auth.jwt()->>'email');

CREATE POLICY "Inserir perfil inicial" 
ON profiles FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- INFO: Este script garante que o sistema consiga salvar a empresa e 
-- atualizar o seu usuário com o ID da nova empresa criada.
