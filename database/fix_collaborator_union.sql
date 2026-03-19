-- 🛠️ UNIFICAÇÃO DE COLABORADORES (INTERNAL + EXTERNAL)
-- Este script atualiza a query do dashboard para incluir colaboradores externos no grid de escalas.

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
    -- 1. Stats
    v_stats := get_shift_stats_optimized(p_company_id);

    -- 2. Shifts (View com Joins)
    SELECT json_agg(s) INTO v_shifts
    FROM (
        SELECT * FROM view_shifts_standard 
        WHERE company_id = p_company_id 
        AND start_time >= p_start_time 
        AND end_time <= p_end_time
        ORDER BY start_time
    ) s;

    -- 3. Unified Employees (Profiles + External Collaborators)
    SELECT json_agg(e) INTO v_employees
    FROM (
        -- Categoria 1: Perfis Internos (Com Login)
        SELECT 
            ep.id, 
            ep.company_id, 
            COALESCE(ep.role, 'member') as role, 
            ep.skills, 
            p.name, 
            p.avatar_url, 
            p.email,
            'internal' as type
        FROM public.employee_profiles ep
        JOIN public.profiles p ON p.user_id::text = ep.profile_id::text
        WHERE ep.company_id = p_company_id

        UNION ALL

        -- Categoria 2: Colaboradores Externos (Sem Login/Campo)
        SELECT 
            id, 
            company_id, 
            'field' as role, 
            ARRAY[specialty] as skills, 
            name, 
            NULL as avatar_url, 
            email,
            'external' as type
        FROM public.collaborators
        WHERE company_id = p_company_id
    ) e;

    -- 4. Environments
    SELECT json_agg(env) INTO v_environments
    FROM (SELECT id, name FROM public.work_environments WHERE company_id = p_company_id) env;

    -- 5. Activities
    SELECT json_agg(act) INTO v_activities
    FROM (SELECT id, name, environment_id, required_skills, required_role FROM public.work_activities WHERE company_id = p_company_id) act;

    -- 6. Raw Activities
    SELECT json_agg(req) INTO v_pending_reqs
    FROM (SELECT id, location as name, description, status, created as created_at FROM public.activities WHERE company_id = p_company_id) req;

    -- 7. Service Requests
    SELECT json_agg(sr) INTO v_service_reqs
    FROM (SELECT id, customer_name, client_unit, service_type, status, created_at FROM public.service_requests WHERE company_id = p_company_id) sr;

    RETURN json_build_object(
        'stats', COALESCE(v_stats, '{"total":0, "open":0, "inProgress":0, "concluded":"0/0"}'::json),
        'shifts', COALESCE(v_shifts, '[]'::json),
        'employees', COALESCE(v_employees, '[]'::json),
        'environments', COALESCE(v_environments, '[]'::json),
        'activities', COALESCE(v_activities, '[]'::json),
        'raw_activities', COALESCE(v_pending_reqs, '[]'::json),
        'service_requests', COALESCE(v_service_reqs, '[]'::json),
        'reboot_success', true
    );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_shifts_dashboard_data_v2(TEXT, TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;
