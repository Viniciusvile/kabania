-- 🚀 FINAL RPC RECONSTRUCTION: SCHEMA-AWARE V3
-- Resolve o erro de "column avatar_url does not exist" e "Multiple Choices"

-- 1. Limpeza total de assinaturas antigas
DROP FUNCTION IF EXISTS public.get_shifts_dashboard_data_v3(text, timestamptz, timestamptz);
DROP FUNCTION IF EXISTS public.get_shifts_dashboard_data_v3(uuid, timestamptz, timestamptz);
DROP FUNCTION IF EXISTS public.get_shifts_dashboard_data_v2(text, timestamptz, timestamptz);
DROP FUNCTION IF EXISTS public.get_shifts_dashboard_data_v2(uuid, timestamptz, timestamptz);

-- 2. Recriar com lógica de JOIN correta
CREATE OR REPLACE FUNCTION public.get_shifts_dashboard_data_v3(
    p_company_id text,
    p_start_date timestamptz,
    p_end_date timestamptz
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result json;
BEGIN
    WITH 
    -- 📊 CTE 1: Escalas Filtradas
    filtered_shifts AS (
        SELECT s.*
        FROM view_shifts_standard s
        WHERE s.company_id::text = p_company_id::text
          AND s.start_time >= p_start_date
          AND s.start_time <= p_end_date
    ),
    -- 👥 CTE 2: Assignments com JOINs CORRETOS para Name/Avatar
    all_assignments AS (
        SELECT 
            sa.shift_id,
            json_build_object(
                'id', sa.id,
                'assignment_id', sa.id,
                'name', COALESCE(p.name, c.name, 'Colaborador'),
                'role', COALESCE(ep.role, c.specialty, 'Campo'),
                'avatar_url', p.avatar_url,
                'employee_id', sa.employee_id,
                'collaborator_id', sa.collaborator_id
            ) as assignment_json
        FROM shift_assignments sa
        LEFT JOIN employee_profiles ep ON sa.employee_id = ep.id
        LEFT JOIN profiles p ON p.user_id::text = ep.profile_id::text
        LEFT JOIN collaborators c ON sa.collaborator_id = c.id
        WHERE sa.shift_id IN (SELECT id FROM filtered_shifts)
    ),
    -- 📦 CTE 3: Agregando Assignments
    aggregated_assignments AS (
        SELECT shift_id, json_agg(assignment_json) as assignments_list
        FROM all_assignments GROUP BY shift_id
    ),
    -- 🏢 CTE 4: Ambientes
    company_environments AS (
        SELECT id, name, description FROM public.work_environments 
        WHERE company_id::text = p_company_id::text ORDER BY name
    ),
    -- 🛠️ CTE 5: Atividades
    company_activities AS (
        SELECT id, name, environment_id, required_skills, required_role FROM public.work_activities 
        WHERE company_id::text = p_company_id::text ORDER BY name
    ),
    -- 📑 CTE 6: Solicitações
    company_service_requests AS (
        SELECT id, customer_name, client_unit, service_type, status, created_at FROM public.service_requests 
        WHERE company_id::text = p_company_id::text AND status NOT IN ('concluded', 'finalized')
        ORDER BY created_at DESC
    ),
    -- 📋 CTE 7: Rotinas
    company_routine_activities AS (
        SELECT id, name, description, status, created_at FROM public.activities 
        WHERE company_id::text = p_company_id::text AND status NOT IN ('concluded', 'finalized')
    ),
    -- 🏃 CTE 8: Funcionários e Colaboradores
    all_personnel AS (
        SELECT 
            ep.id as shift_profile_id, ep.company_id, ep.profile_id, ep.role, ep.skills, 
            p.name, p.avatar_url, p.email, false as is_external
        FROM public.employee_profiles ep
        JOIN public.profiles p ON p.user_id::text = ep.profile_id::text
        WHERE ep.company_id::text = p_company_id::text
        UNION ALL
        SELECT 
            id as shift_profile_id, company_id::text as company_id, id as profile_id, 
            specialty as role, '{}'::text[] as skills, name, null as avatar_url, 
            null as email, true as is_external
        FROM public.collaborators
        WHERE company_id::text = p_company_id::text
    )
    -- 🏗️ RESULTADO FINAL
    SELECT json_build_object(
        'shifts', COALESCE((
            SELECT json_agg(row_to_json(fs_final))
            FROM (
                SELECT 
                    fs.*,
                    COALESCE(aa.assignments_list, '[]'::json) as assigned_employees
                FROM filtered_shifts fs
                LEFT JOIN aggregated_assignments aa ON fs.id = aa.shift_id
            ) fs_final
        ), '[]'::json),
        'stats', (
            SELECT json_build_object(
                'total', COUNT(*),
                'open', COUNT(*) FILTER (WHERE status IN ('open', 'scheduled')),
                'active', COUNT(*) FILTER (WHERE status IN ('in_progress', 'active'))
            ) FROM filtered_shifts
        ),
        'environments', COALESCE((SELECT json_agg(row_to_json(e)) FROM company_environments e), '[]'::json),
        'activities', COALESCE((SELECT json_agg(row_to_json(a)) FROM company_activities a), '[]'::json),
        'service_requests', COALESCE((SELECT json_agg(row_to_json(sr)) FROM company_service_requests sr), '[]'::json),
        'raw_activities', COALESCE((SELECT json_agg(row_to_json(ra)) FROM company_routine_activities ra), '[]'::json),
        'employees', COALESCE((SELECT json_agg(row_to_json(ap)) FROM all_personnel ap), '[]'::json)
    ) INTO v_result;

    RETURN v_result;
END;
$$;
