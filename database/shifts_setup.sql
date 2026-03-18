-- ============================================================================
-- Gestão Inteligente de Escalas de Trabalho (Smart Work Shifts) Setup
-- ============================================================================
-- NOTE: Execute this script in the Supabase SQL Editor.

-- Enable UUID generation if not already enabled (usually is in Supabase)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Ambientes de Trabalho (Work Environments)
CREATE TABLE IF NOT EXISTS public.work_environments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id TEXT REFERENCES public.companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    min_coverage INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Atividades (Work Activities)
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

-- 3. Perfis de Funcionário (Employee Profiles)
-- This extends the public.profiles table with work-specific metrics
CREATE TABLE IF NOT EXISTS public.employee_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id TEXT REFERENCES public.companies(id) ON DELETE CASCADE,
    profile_id UUID NOT NULL, -- Logical link to public.profiles
    role TEXT,
    max_daily_hours NUMERIC DEFAULT 8,
    max_weekly_hours NUMERIC DEFAULT 44,
    availability_schedule JSONB DEFAULT '{}'::jsonb, -- e.g., {"monday": ["08:00", "18:00"]}
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
-- We use a logical link for profile_id because profiles id might be TEXT or UUID depending on existing schema.
-- Let's check: the user usually uses UUID for profile ID.

-- 4. Escalas (Shifts)
CREATE TABLE IF NOT EXISTS public.shifts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id TEXT REFERENCES public.companies(id) ON DELETE CASCADE,
    environment_id UUID REFERENCES public.work_environments(id) ON DELETE SET NULL,
    activity_id UUID REFERENCES public.work_activities(id) ON DELETE SET NULL,
    employee_id UUID REFERENCES public.employee_profiles(id) ON DELETE SET NULL,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    status TEXT DEFAULT 'scheduled', -- 'scheduled', 'active', 'completed', 'absent'
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.work_environments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;

-- Standard Multi-tenant Policies (Company Isolation)

-- Work Environments
DROP POLICY IF EXISTS "Users can view company environments" ON public.work_environments;
CREATE POLICY "Users can view company environments" ON public.work_environments
    FOR SELECT TO authenticated USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE profiles.user_id = auth.uid() AND profiles.company_id = work_environments.company_id)
    );

DROP POLICY IF EXISTS "Users can manage company environments" ON public.work_environments;
CREATE POLICY "Users can manage company environments" ON public.work_environments
    FOR ALL TO authenticated USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE profiles.user_id = auth.uid() AND profiles.company_id = work_environments.company_id AND profiles.role = 'admin')
    );

-- Work Activities
DROP POLICY IF EXISTS "Users can view company activities" ON public.work_activities;
CREATE POLICY "Users can view company activities" ON public.work_activities
    FOR SELECT TO authenticated USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE profiles.user_id = auth.uid() AND profiles.company_id = work_activities.company_id)
    );

DROP POLICY IF EXISTS "Users can manage company activities" ON public.work_activities;
CREATE POLICY "Users can manage company activities" ON public.work_activities
    FOR ALL TO authenticated USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE profiles.user_id = auth.uid() AND profiles.company_id = work_activities.company_id AND profiles.role = 'admin')
    );

-- Employee Profiles
DROP POLICY IF EXISTS "Users can view company employee profiles" ON public.employee_profiles;
CREATE POLICY "Users can view company employee profiles" ON public.employee_profiles
    FOR SELECT TO authenticated USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE profiles.user_id = auth.uid() AND profiles.company_id = employee_profiles.company_id)
    );

DROP POLICY IF EXISTS "Users can manage company employee profiles" ON public.employee_profiles;
CREATE POLICY "Users can manage company employee profiles" ON public.employee_profiles
    FOR ALL TO authenticated USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE profiles.user_id = auth.uid() AND profiles.company_id = employee_profiles.company_id AND profiles.role = 'admin')
    );

-- Shifts
DROP POLICY IF EXISTS "Users can view company shifts" ON public.shifts;
CREATE POLICY "Users can view company shifts" ON public.shifts
    FOR SELECT TO authenticated USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE profiles.user_id = auth.uid() AND profiles.company_id = shifts.company_id)
    );

DROP POLICY IF EXISTS "Users can manage company shifts" ON public.shifts;
CREATE POLICY "Users can manage company shifts" ON public.shifts
    FOR ALL TO authenticated USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE profiles.user_id = auth.uid() AND profiles.company_id = shifts.company_id AND profiles.role = 'admin')
    );
