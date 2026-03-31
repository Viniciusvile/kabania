-- ============================================================================
-- ORQUESTRAÇÃO DE RELACIONAMENTOS (FOREIGN KEYS) - SEGURANÇA E PERFORMANCE
--=============================================================================
-- Execute este script no SQL Editor do Supabase se o sistema ainda reportar
-- erros de "BAD REQUEST" ao carregar colaboradores ou perfis.

-- 1. Garantir que a coluna profile_id é do tipo UUID em employee_profiles
-- (Se o banco já tiver dados, pode ser necessário converter)
DO $$ 
BEGIN 
    -- Tenta converter para UUID se for texto, senão mantém
    ALTER TABLE public.employee_profiles 
    ALTER COLUMN profile_id TYPE UUID USING profile_id::UUID;
EXCEPTION WHEN OTHERS THEN 
    NULL;
END $$;

-- 2. Garantir que a coluna de destino (profiles.user_id) é UNICA para ser referenciada
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_user_id_unique') THEN
        ALTER TABLE public.profiles ADD CONSTRAINT profiles_user_id_unique UNIQUE (user_id);
    END IF;
EXCEPTION WHEN OTHERS THEN 
    NULL;
END $$;

-- 3. Adição da Foreign Key (Este é o passo que resolve o erro 400 em joins do Supabase)
ALTER TABLE public.employee_profiles
DROP CONSTRAINT IF EXISTS fk_employee_profiles_profiles;

ALTER TABLE public.employee_profiles
ADD CONSTRAINT fk_employee_profiles_profiles
FOREIGN KEY (profile_id) 
REFERENCES public.profiles(user_id)
ON DELETE CASCADE;

-- 3. Índices para performance
CREATE INDEX IF NOT EXISTS idx_employee_profiles_profile_linked ON public.employee_profiles(profile_id);
