-- profile_expansion.sql
-- Adiciona campos extras ao perfil para suportar o novo layout de 2 colunas

DO $$ 
BEGIN 
    -- 1. First Name
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='profiles' AND COLUMN_NAME='first_name') THEN
        ALTER TABLE public.profiles ADD COLUMN first_name TEXT;
    END IF;

    -- 2. Last Name
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='profiles' AND COLUMN_NAME='last_name') THEN
        ALTER TABLE public.profiles ADD COLUMN last_name TEXT;
    END IF;

    -- 3. Username
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='profiles' AND COLUMN_NAME='username') THEN
        ALTER TABLE public.profiles ADD COLUMN username TEXT;
    END IF;

    -- 4. Phone Number
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='profiles' AND COLUMN_NAME='phone_number') THEN
        ALTER TABLE public.profiles ADD COLUMN phone_number TEXT;
    END IF;
END $$;

-- Garantir que as permissões de RLS permitam a atualização destes novos campos
-- (A política "Usuários podem atualizar o próprio perfil" já cobre todas as colunas)
