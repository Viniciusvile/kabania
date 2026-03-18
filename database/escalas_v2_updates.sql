-- ============================================================================
-- Escalas v2: Support for Multiple Employees and Calls (Chamados)
-- ============================================================================

-- 1. Junction table for multiple employees per shift
CREATE TABLE IF NOT EXISTS public.shift_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shift_id UUID REFERENCES public.shifts(id) ON DELETE CASCADE,
    employee_id UUID REFERENCES public.employee_profiles(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'active', -- 'active', 'absent', 'replaced'
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(shift_id, employee_id)
);

-- 2. Table for calls/incidents per shift
CREATE TABLE IF NOT EXISTS public.shift_calls (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id TEXT REFERENCES public.companies(id) ON DELETE CASCADE,
    shift_id UUID REFERENCES public.shifts(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    status TEXT DEFAULT 'open', -- 'open', 'resolved'
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Update shifts status constraint (if needed) and add metadata
-- We'll just define the expected status values: 'open', 'in_progress', 'completed', 'late'

-- Enable RLS for new tables
ALTER TABLE public.shift_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shift_calls ENABLE ROW LEVEL SECURITY;

-- RLS Policies for shift_assignments
DROP POLICY IF EXISTS "Users can view shift assignments" ON public.shift_assignments;
CREATE POLICY "Users can view shift assignments" ON public.shift_assignments
    FOR SELECT TO authenticated USING (
        EXISTS (SELECT 1 FROM public.shifts s WHERE s.id = shift_assignments.shift_id AND 
               EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = auth.uid() AND p.company_id = s.company_id))
    );

DROP POLICY IF EXISTS "Admins can manage shift assignments" ON public.shift_assignments;
CREATE POLICY "Admins can manage shift assignments" ON public.shift_assignments
    FOR ALL TO authenticated USING (
        EXISTS (SELECT 1 FROM public.shifts s WHERE s.id = shift_assignments.shift_id AND 
               EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = auth.uid() AND p.company_id = s.company_id AND p.role = 'admin'))
    );

-- RLS Policies for shift_calls
DROP POLICY IF EXISTS "Users can view shift calls" ON public.shift_calls;
CREATE POLICY "Users can view shift calls" ON public.shift_calls
    FOR SELECT TO authenticated USING (
        EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = auth.uid() AND p.company_id = shift_calls.company_id)
    );

DROP POLICY IF EXISTS "Users can manage shift calls" ON public.shift_calls;
CREATE POLICY "Users can manage shift calls" ON public.shift_calls
    FOR ALL TO authenticated USING (
        EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = auth.uid() AND p.company_id = shift_calls.company_id AND p.role = 'admin')
    );
