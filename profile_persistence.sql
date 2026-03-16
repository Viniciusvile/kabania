-- profile_persistence.sql
-- Garante que a tabela profiles tem as colunas necessárias para nome e avatar

-- 1. Adicionar colunas se não existirem
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='profiles' AND COLUMN_NAME='name') THEN
        ALTER TABLE profiles ADD COLUMN name TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='profiles' AND COLUMN_NAME='avatar_url') THEN
        ALTER TABLE profiles ADD COLUMN avatar_url TEXT;
    END IF;
END $$;

-- 2. Garantir Políticas de RLS para Profiles
-- (Pode já existir, mas garantimos que o usuário possa atualizar o próprio nome/avatar)
DROP POLICY IF EXISTS "Usuários podem atualizar o próprio perfil" ON profiles;
CREATE POLICY "Usuários podem atualizar o próprio perfil" ON profiles 
FOR UPDATE USING (auth.email() = email);

-- 3. Configurar Storage para Avatares
-- (Instrução: Usuário deve garantir que o bucket 'avatars' exista no Supabase Console como PUBLIC)
-- As políticas abaixo garantem que o usuário possa fazer upload e todos possam ver (se público)

-- Nota: Buckets do Supabase são gerenciados via storage.buckets e storage.objects
-- Tenta criar o bucket se possível (pode falhar dependendo das permissões do editor SQL, mas as políticas funcionam)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Avatar Upload Policy" ON storage.objects;
CREATE POLICY "Avatar Upload Policy" ON storage.objects 
FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Avatar Update Policy" ON storage.objects;
CREATE POLICY "Avatar Update Policy" ON storage.objects 
FOR UPDATE USING (bucket_id = 'avatars' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Avatar Public Access" ON storage.objects;
CREATE POLICY "Avatar Public Access" ON storage.objects 
FOR SELECT USING (bucket_id = 'avatars');
