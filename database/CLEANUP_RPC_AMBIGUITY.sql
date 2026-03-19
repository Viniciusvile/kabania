-- 🧹 DEEP CLEANUP: LIMPANDO DUPLICIDADES DE FUNÇÕES
-- Resolve o erro "300 Multiple Choices" removendo versões antigas com tipos diferentes

-- 1. Remover TODAS as versões possíveis para evitar ambiguidade
DROP FUNCTION IF EXISTS public.get_shifts_dashboard_data_v3(text, timestamptz, timestamptz);
DROP FUNCTION IF EXISTS public.get_shifts_dashboard_data_v3(uuid, timestamptz, timestamptz);
DROP FUNCTION IF EXISTS public.get_shifts_dashboard_data_v2(text, timestamptz, timestamptz);
DROP FUNCTION IF EXISTS public.get_shifts_dashboard_data_v2(uuid, timestamptz, timestamptz);

-- 2. Recriar a versão V3 FINAL com parâmetro TEXT (Padrão Kabania)
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
    -- 📊 CTE 1: Escalas (Safe Cast)
    filtered_shifts AS (
        SELECT s.*
        FROM view_shifts_standard s
        WHERE s.company_id::text = p_company_id::text
          AND s.start_time >= p_start_date
          AND s.start_time <= p_end_date
    ),
    -- 👥 CTE 2: Assignments
    all_assignments AS (
        SELECT 
            sa.shift_id,
            json_build_object(
                'id', sa.id,
                'name', COALESCE(ep.full_name, c.name, 'Colaborador'),
                'role', COALESCE(ep.role, c.role, 'Campo'),
                'avatar_url', COALESCE(ep.avatar_url, c.avatar_url),
                'employee_id', sa.employee_id,
                'collaborator_id', sa.collaborator_id
            ) as assignment_json
        FROM shift_assignments sa
        LEFT JOIN employee_profiles ep ON sa.employee_id = ep.id
        LEFT JOIN lateral (
            SELECT name, role, avatar_url 
            FROM collaborators 
            WHERE id = sa.collaborator_id
        ) c ON sa.collaborator_id IS NOT NULL
        WHERE sa.shift_id IN (SELECT id FROM filtered_shifts)
    ),
    -- 📦 CTE 3: Agregação
    aggregated_assignments AS (
        SELECT shift_id, json_agg(assignment_json) as assignments_list
        FROM all_assignments GROUP BY shift_id
    ),
    -- 🏢 CTE 4: Ambientes (Filtro por texto)
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
    -- 🏃 CTE 8: Pessoal Unificado
    all_personnel AS (
        SELECT ep.id as shift_profile_id, ep.company_id, ep.profile_id, ep.role, ep.skills, p.name, p.avatar_url, p.email, false as is_external
        FROM public.employee_profiles ep
        JOIN public.profiles p ON p.user_id::text = ep.profile_id::text
        WHERE ep.company_id::text = p_company_id::text
        UNION ALL
        SELECT id as shift_profile_id, company_id::text as company_id, id as profile_id, specialty as role, '{}'::text[] as skills, name, null as avatar_url, null as email, true as is_external
        FROM public.collaborators
        WHERE company_id::text = p_company_id::text
    )
    -- 🏗️ RESULTADO FINAL
    SELECT json_build_object(
        'shifts', COALESCE((SELECT json_agg(row_to_json(fs)) FROM (SELECT fs.*, COALESCE(aa.assignments_list, '[]'::json) as assigned_employees FROM filtered_shifts fs LEFT JOIN aggregated_assignments aa ON fs.id = aa.shift_id) fs), '[]'::json),
        'stats', (SELECT json_build_object('total', COUNT(*), 'open', COUNT(*) FILTER (WHERE status IN ('open', 'scheduled')), 'active', COUNT(*) FILTER (WHERE status IN ('in_progress', 'active'))) FROM filtered_shifts),
        'environments', COALESCE((SELECT json_agg(row_to_json(e)) FROM company_environments e), '[]'::json),
        'activities', COALESCE((SELECT json_agg(row_to_json(a)) FROM company_activities a), '[]'::json),
        'service_requests', COALESCE((SELECT json_agg(row_to_json(sr)) FROM company_service_requests sr), '[]'::json),
        'raw_activities', COALESCE((SELECT json_agg(row_to_json(ra)) FROM company_routine_activities ra), '[]'::json),
        'employees', COALESCE((SELECT json_agg(row_to_json(ap)) FROM all_personnel ap), '[]'::json)
    ) INTO v_result;

    RETURN v_result;
END;
$$;
