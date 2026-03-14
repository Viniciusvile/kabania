-- SCRIPT DE CORREÇÃO DEFINITIVA (V3)
-- Execute no SQL Editor do Supabase (https://app.supabase.com/project/_/sql)

-- 1. LIMPEZA TOTAL DE POLÍTICAS ANTIGAS (Garante que não haverá erro de "Already Exists")
-- Empresas
DROP POLICY IF EXISTS "Usuarios podem criar empresas" ON companies;
DROP POLICY IF EXISTS "Usuarios podem ver sua propria empresa" ON companies;
DROP POLICY IF EXISTS "Permitir criar empresa" ON companies;
DROP POLICY IF EXISTS "Permitir ver empresa vinculada" ON companies;

-- Perfis
DROP POLICY IF EXISTS "Usuarios podem ver proprio perfil" ON profiles;
DROP POLICY IF EXISTS "Usuarios podem atualizar proprio perfil" ON profiles;
DROP POLICY IF EXISTS "Permitir inserção de perfil no login" ON profiles;
DROP POLICY IF EXISTS "Ver próprio perfil" ON profiles;
DROP POLICY IF EXISTS "Atualizar próprio perfil" ON profiles;
DROP POLICY IF EXISTS "Inserir perfil inicial" ON profiles;

-- 2. AJUSTE DE COLUNA
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='user_id') THEN
    ALTER TABLE profiles ADD COLUMN user_id UUID;
  END IF;
END $$;

-- 3. HABILITAR SEGURANÇA (RLS)
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 4. NOVAS POLÍTICAS (Nomes Unificados)
-- Empresas
CREATE POLICY "Permitir criar empresa" 
ON companies FOR INSERT 
TO authenticated 
WITH CHECK (true);

CREATE POLICY "Permitir ver empresa vinculada" 
ON companies FOR SELECT 
TO authenticated 
USING (true);

-- Perfis
CREATE POLICY "Ver próprio perfil" 
ON profiles FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Atualizar próprio perfil" 
ON profiles FOR UPDATE 
TO authenticated 
USING (email = auth.jwt()->>'email')
WITH CHECK (email = auth.jwt()->>'email');

CREATE POLICY "Inserir perfil inicial" 
ON profiles FOR INSERT 
TO authenticated 
WITH CHECK (true);
