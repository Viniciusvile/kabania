-- 🚀 ESCALAS V5: TURBO PERFORMANCE (OBSIDIAN ARCHITECTURE)
-- Este script aplica as métricas de performance O(1) recomendadas na documentação.

-- 1. FUNÇÃO DE ACESSO STABLE (SEGURANÇA O(1))
CREATE OR REPLACE FUNCTION public.check_company_access(target_company_id TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    is_valid BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE (user_id::text = auth.uid()::text) 
        AND company_id = target_company_id
    ) INTO is_valid;
    RETURN is_valid;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- 2. ATUALIZAÇÃO DE RLS
DROP POLICY IF EXISTS "Users can view company environments" ON public.work_environments;
CREATE POLICY "Users can view company environments" ON public.work_environments
FOR SELECT TO authenticated USING ( check_company_access(company_id) );

DROP POLICY IF EXISTS "Users can view company activities" ON public.work_activities;
CREATE POLICY "Users can view company activities" ON public.work_activities
FOR SELECT TO authenticated USING ( check_company_access(company_id) );

DROP POLICY IF EXISTS "Users can view company employee profiles" ON public.employee_profiles;
CREATE POLICY "Users can view company employee profiles" ON public.employee_profiles
FOR SELECT TO authenticated USING ( check_company_access(company_id) );

DROP POLICY IF EXISTS "Users can view company shifts" ON public.shifts;
CREATE POLICY "Users can view company shifts" ON public.shifts
FOR SELECT TO authenticated USING ( check_company_access(company_id) );

-- 3. RPC: TURBO DASHBOARD LOADER (SINGLE REQUEST)
CREATE OR REPLACE FUNCTION get_shifts_dashboard_data_v2(
    p_company_id TEXT,
    p_start_time TIMESTAMPTZ,
    p_end_time TIMESTAMPTZ
)
RETURNS JSON AS $$
DECLARE
    v_stats JSON;
    v_shifts JSON;
    v_employees JSON;
    v_environments JSON;
    v_activities JSON;
    v_pending_reqs JSON;
    v_service_reqs JSON;
BEGIN
    -- Get Stats
    SELECT get_shift_stats_optimized(p_company_id) INTO v_stats;

    -- Get Shifts (via view)
    SELECT json_agg(s) INTO v_shifts
    FROM (
        SELECT * FROM view_shifts_standard 
        WHERE company_id = p_company_id 
        AND start_time >= p_start_time 
        AND end_time <= p_end_time
        ORDER BY start_time
    ) s;

    -- Get Employees
    SELECT json_agg(e) INTO v_employees
    FROM (
        SELECT ep.*, p.name, p.avatar_url, p.email
        FROM public.employee_profiles ep
        JOIN public.profiles p ON p.user_id::text = ep.profile_id::text OR p.user_id::text = auth.uid()::text
        WHERE ep.company_id = p_company_id
    ) e;

    -- Get Environments
    SELECT json_agg(env) INTO v_environments
    FROM (SELECT id, name FROM public.work_environments WHERE company_id = p_company_id) env;

    -- Get Activities (Work Activities)
    SELECT json_agg(act) INTO v_activities
    FROM (SELECT id, name, environment_id, required_skills, required_role FROM public.work_activities WHERE company_id = p_company_id) act;

    -- Get Activities (General requests)
    SELECT json_agg(req) INTO v_pending_reqs
    FROM (SELECT id, location as name, description, status, created as created_at FROM public.activities WHERE company_id = p_company_id) req;

    -- Get Service Requests
    SELECT json_agg(sr) INTO v_service_reqs
    FROM (SELECT id, customer_name, client_unit, service_type, status, created_at FROM public.service_requests WHERE company_id = p_company_id) sr;

    RETURN json_build_object(
        'stats', COALESCE(v_stats, '{"total":0, "open":0, "inProgress":0, "concluded":"0/0"}'::json),
        'shifts', COALESCE(v_shifts, '[]'::json),
        'employees', COALESCE(v_employees, '[]'::json),
        'environments', COALESCE(v_environments, '[]'::json),
        'activities', COALESCE(v_activities, '[]'::json),
        'raw_activities', COALESCE(v_pending_reqs, '[]'::json),
        'service_requests', COALESCE(v_service_reqs, '[]'::json)
    );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_shifts_dashboard_data_v2(TEXT, TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;
