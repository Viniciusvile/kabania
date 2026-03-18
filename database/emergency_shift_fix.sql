-- 1. Ensure Foreign Keys exist for PostgREST joins
-- First ensure profiles(user_id) is UNIQUE so it can be referenced
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'profiles_user_id_key'
    ) THEN
        ALTER TABLE public.profiles ADD CONSTRAINT profiles_user_id_key UNIQUE (user_id);
    END IF;
END $$;

-- Check if profile_id in employee_profiles has a reference
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'employee_profiles_profile_id_fkey'
    ) THEN
        ALTER TABLE public.employee_profiles 
        ADD CONSTRAINT employee_profiles_profile_id_fkey 
        FOREIGN KEY (profile_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;
    END IF;
END $$;

-- 2. Add composite indexes for Shift performance
CREATE INDEX IF NOT EXISTS idx_shifts_company_time ON public.shifts (company_id, start_time, end_time);
CREATE INDEX IF NOT EXISTS idx_shift_assignments_shift ON public.shift_assignments (shift_id);

-- 3. Optimization of getShifts view (Logical)
-- We ensure that public.employee_profiles has role and status correctly typed
ALTER TABLE public.employee_profiles ALTER COLUMN role SET DEFAULT 'colaborador';

-- 4. RLS Policy Robustness
-- Ensure users can see their own profiles and company collaborators
DROP POLICY IF EXISTS "Users can view relevant profiles" ON public.profiles;
CREATE POLICY "Users can view relevant profiles" ON public.profiles
    FOR SELECT TO authenticated USING (
        company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1)
    );

-- 5. Fix shift_assignments RLS to be more direct
DROP POLICY IF EXISTS "Users can view shift assignments v2" ON public.shift_assignments;
CREATE POLICY "Users can view shift assignments v2" ON public.shift_assignments
    FOR SELECT TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.shifts 
            WHERE shifts.id = shift_assignments.shift_id 
            AND shifts.company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1)
        )
    );

-- 6. Grant basic permissions
GRANT SELECT ON public.employee_profiles TO authenticated;
GRANT SELECT ON public.shift_assignments TO authenticated;
GRANT SELECT ON public.shift_calls TO authenticated;
