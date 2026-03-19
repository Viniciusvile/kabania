-- 🚀 PERFORMANCE TURBO UPDATE V2: RECURSOS COMPLETOS
-- Atualiza a RPC para retornar TODOS os dados necessários pelo ShiftsModule

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
    -- 📊 CTE 1: Todas as escalas no período
    filtered_shifts AS (
        SELECT s.*
        FROM view_shifts_standard s
        WHERE s.company_id::text = p_company_id::text
          AND s.start_time >= p_start_date
          AND s.start_time <= p_end_date
    ),
    -- 👥 CTE 2: Todos os assignments vinculados a essas escalas
    all_assignments AS (
        SELECT 
            sa.shift_id,
            json_build_object(
                'id', sa.id,
                'assignment_id', sa.id,
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
    -- 📦 CTE 3: Agregação dos assignments por shift (Elimina o N+1)
    aggregated_assignments AS (
        SELECT 
            shift_id,
            json_agg(assignment_json) as assignments_list
        FROM all_assignments
        GROUP BY shift_id
    ),
    -- 🏢 CTE 4: Ambientes de Trabalho
    company_environments AS (
        SELECT id, name, description
        FROM public.work_environments
        WHERE company_id = p_company_id
        ORDER BY name
    ),
    -- 🛠️ CTE 5: Atividades Recomendadas
    company_activities AS (
        SELECT id, name, environment_id
        FROM public.work_activities
        WHERE company_id = p_company_id
        ORDER BY name
    ),
    -- 📑 CTE 6: Solicitações de Serviço (Pendentes)
    company_service_requests AS (
        SELECT *
        FROM public.service_requests
        WHERE company_id = p_company_id
        AND status NOT IN ('concluded', 'finalized')
        ORDER BY created_at DESC
    )
    -- 🏗️ RESULTADO FINAL: JSON Unificado
    SELECT json_build_object(
        'shifts', (
            SELECT json_agg(row_to_json(final_shifts))
            FROM (
                SELECT 
                    fs.*,
                    COALESCE(aa.assignments_list, '[]'::json) as assigned_employees
                FROM filtered_shifts fs
                LEFT JOIN aggregated_assignments aa ON fs.id = aa.shift_id
            ) final_shifts
        ),
        'stats', (
            SELECT json_build_object(
                'total', (SELECT count(*) FROM filtered_shifts),
                'open', (SELECT count(*) FROM filtered_shifts WHERE status = 'open' OR status = 'scheduled'),
                'active', (SELECT count(*) FROM filtered_shifts WHERE status = 'in_progress' OR status = 'active')
            )
        ),
        'environments', (SELECT json_agg(row_to_json(e)) FROM company_environments e),
        'activities', (SELECT json_agg(row_to_json(a)) FROM company_activities a),
        'service_requests', (SELECT json_agg(row_to_json(sr)) FROM company_service_requests sr),
        'employees', (
            SELECT json_agg(json_build_object(
                'id', ep.id,
                'profile_id', ep.profile_id,
                'full_name', ep.full_name,
                'name', p.name,
                'role', ep.role,
                'avatar_url', p.avatar_url,
                'is_external', false,
                'skills', ep.skills
            ))
            FROM employee_profiles ep
            JOIN profiles p ON ep.profile_id = p.id
            WHERE ep.company_id = p_company_id
        )
    ) INTO v_result;

    RETURN v_result;
END;
$$;
