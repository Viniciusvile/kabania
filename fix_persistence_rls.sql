-- 1. Garante que a coluna user_id existe em profiles
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='profiles' AND COLUMN_NAME='user_id') THEN
        ALTER TABLE profiles ADD COLUMN user_id UUID REFERENCES auth.users(id);
    END IF;
END $$;

-- 2. Habilita RLS em profiles (se não estiver)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 3. Políticas para PROFILES (Crucial para o sistema funcionar)
DROP POLICY IF EXISTS "Usuários podem ver o próprio perfil" ON profiles;
CREATE POLICY "Usuários podem ver o próprio perfil" ON profiles FOR SELECT USING (auth.email() = email);

DROP POLICY IF EXISTS "Usuários podem atualizar o próprio perfil" ON profiles;
CREATE POLICY "Usuários podem atualizar o próprio perfil" ON profiles FOR UPDATE USING (auth.email() = email);

DROP POLICY IF EXISTS "Permitir inserção de novo perfil" ON profiles;
CREATE POLICY "Permitir inserção de novo perfil" ON profiles FOR INSERT WITH CHECK (true);

-- 4. Corrige as políticas de ISOLAMENTO por empresa
-- Precisamos usar email ou user_id de forma consistente. Como o email é o PK em profiles:

DROP POLICY IF EXISTS "Users can only see their own company's tasks" ON tasks;
CREATE POLICY "Users can only see their own company's tasks" ON tasks 
FOR ALL USING (
  company_id IN (SELECT company_id FROM profiles WHERE email = auth.jwt()->>'email')
);

DROP POLICY IF EXISTS "Users can only see their own company's projects" ON projects;
CREATE POLICY "Users can only see their own company's projects" ON projects 
FOR ALL USING (
  company_id IN (SELECT company_id FROM profiles WHERE email = auth.jwt()->>'email')
);

DROP POLICY IF EXISTS "Users can only see their own company's activities" ON activities;
CREATE POLICY "Users can only see their own company's activities" ON activities 
FOR ALL USING (
  company_id IN (SELECT company_id FROM profiles WHERE email = auth.jwt()->>'email')
);

DROP POLICY IF EXISTS "Users can only see their own company's knowledge" ON knowledge_base;
CREATE POLICY "Users can only see their own company's knowledge" ON knowledge_base 
FOR ALL USING (
  company_id IN (SELECT company_id FROM profiles WHERE email = auth.jwt()->>'email')
);
