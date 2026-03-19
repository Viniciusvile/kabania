-- 🛠️ UNIFICAÇÃO DE COLABORADORES (INTERNAL + EXTERNAL) - V3
-- Este script atualiza a query do dashboard para incluir o flag is_external.

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

    -- 2. Shifts (View com Joins) - ATUALIZADO PARA INCLUIR ASSIGNMENT DETAILS
    SELECT json_agg(s) INTO v_shifts
    FROM (
        SELECT 
            ss.*,
            (
                SELECT json_agg(a)
                FROM (
                    SELECT 
                        sa.*,
                        CASE 
                            WHEN sa.employee_id IS NOT NULL THEN (
                                SELECT json_build_object(
                                    'id', ep.id, 
                                    'role', ep.role, 
                                    'profiles', json_build_object('name', p.name, 'avatar_url', p.avatar_url)
                                )
                                FROM employee_profiles ep
                                JOIN profiles p ON p.user_id::text = ep.profile_id::text
                                WHERE ep.id = sa.employee_id
                            )
                            WHEN sa.collaborator_id IS NOT NULL THEN (
                                SELECT json_build_object(
                                    'id', c.id, 
                                    'role', c.specialty, 
                                    'profiles', json_build_object('name', c.name, 'avatar_url', null)
                                )
                                FROM collaborators c
                                WHERE c.id = sa.collaborator_id
                            )
                        END as employee_profiles
                    FROM shift_assignments sa
                    WHERE sa.shift_id = ss.id
                ) a
            ) as shift_assignments
        FROM view_shifts_standard ss
        WHERE ss.company_id = p_company_id 
        AND ss.start_time >= p_start_time 
        AND ss.end_time <= p_end_time
        ORDER BY ss.start_time
    ) s;

    -- 3. Employees (Unificado com flag is_external)
    SELECT json_agg(e) INTO v_employees
    FROM (
        SELECT ep.id as shift_profile_id, ep.company_id, ep.profile_id, ep.role, ep.skills, p.name, p.avatar_url, p.email, false as is_external
        FROM public.employee_profiles ep
        JOIN public.profiles p ON p.user_id::text = ep.profile_id::text
        WHERE ep.company_id = p_company_id
        UNION ALL
        SELECT id as shift_profile_id, company_id, id as profile_id, specialty as role, '{}'::text[] as skills, name, null as avatar_url, null as email, true as is_external
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
