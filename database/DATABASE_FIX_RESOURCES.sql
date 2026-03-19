-- 🛠️ DATABASE FIX: AMBIENTES E ATIVIDADES (RESOURCES)
-- Este script corrige o esquema das tabelas work_environments e work_activities.

-- 1. Tabela de Ambientes de Trabalho
CREATE TABLE IF NOT EXISTS public.work_environments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id TEXT REFERENCES public.companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Forçar a existência da coluna 'id' caso a tabela tenha sido criada sem ela por erro anterior
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='work_environments' AND column_name='id') THEN
        ALTER TABLE public.work_environments ADD COLUMN id UUID PRIMARY KEY DEFAULT uuid_generate_v4();
    END IF;
END $$;

-- 2. Tabela de Atividades
CREATE TABLE IF NOT EXISTS public.work_activities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id TEXT REFERENCES public.companies(id) ON DELETE CASCADE,
    environment_id UUID REFERENCES public.work_environments(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    required_role TEXT,
    duration_minutes INTEGER DEFAULT 60,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Habilitar RLS e Criar Políticas
ALTER TABLE public.work_environments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_activities ENABLE ROW LEVEL SECURITY;

-- Políticas para work_environments
DROP POLICY IF EXISTS "Resource view policy" ON public.work_environments;
CREATE POLICY "Resource view policy" ON public.work_environments
    FOR SELECT TO authenticated USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE profiles.user_id = auth.uid() AND profiles.company_id = work_environments.company_id)
    );

DROP POLICY IF EXISTS "Resource manage policy" ON public.work_environments;
CREATE POLICY "Resource manage policy" ON public.work_environments
    FOR ALL TO authenticated USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE profiles.user_id = auth.uid() AND profiles.company_id = work_environments.company_id AND profiles.role = 'admin')
    );

-- Políticas para work_activities
DROP POLICY IF EXISTS "Activity view policy" ON public.work_activities;
CREATE POLICY "Activity view policy" ON public.work_activities
    FOR SELECT TO authenticated USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE profiles.user_id = auth.uid() AND profiles.company_id = work_activities.company_id)
    );

DROP POLICY IF EXISTS "Activity manage policy" ON public.work_activities;
CREATE POLICY "Activity manage policy" ON public.work_activities
    FOR ALL TO authenticated USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE profiles.user_id = auth.uid() AND profiles.company_id = work_activities.company_id AND profiles.role = 'admin')
    );

-- 4. Criar Índices para Performance
CREATE INDEX IF NOT EXISTS idx_work_envs_company ON public.work_environments (company_id);
CREATE INDEX IF NOT EXISTS idx_work_acts_company ON public.work_activities (company_id);
CREATE INDEX IF NOT EXISTS idx_work_acts_env ON public.work_activities (environment_id);

-- ✅ DATABASE SYNCRONIZED
