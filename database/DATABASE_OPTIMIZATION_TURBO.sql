-- 🚀 PERFORMANCE TURBO: KABANIA SHIFTS OPTIMIZATION
-- Foco: Reduzir tempo de carregamento de 20s para < 1s

-- 1️⃣ ÍNDICES ESTRATÉGICOS
CREATE INDEX IF NOT EXISTS idx_shifts_company_time ON public.shifts (company_id, start_time, end_time);
CREATE INDEX IF NOT EXISTS idx_shift_assignments_shift_id ON public.shift_assignments (shift_id);
CREATE INDEX IF NOT EXISTS idx_shift_assignments_employee_id ON public.shift_assignments (employee_id) WHERE employee_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_shift_assignments_collaborator_id ON public.shift_assignments (collaborator_id) WHERE collaborator_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_work_environments_company ON public.work_environments (company_id);
CREATE INDEX IF NOT EXISTS idx_work_activities_company ON public.work_activities (company_id);
CREATE INDEX IF NOT EXISTS idx_service_requests_company ON public.service_requests (company_id);

-- 2️⃣ RPC REFATORADA (SEM N+1)
CREATE OR REPLACE FUNCTION public.get_shifts_dashboard_data_v3(
    p_company_id uuid,
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
        WHERE s.company_id = p_company_id
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
                'total', COUNT(*),
                'open', COUNT(*) FILTER (WHERE status = 'open' OR status = 'scheduled'),
                'active', COUNT(*) FILTER (WHERE status = 'in_progress' OR status = 'active')
            )
            FROM filtered_shifts
        )
    ) INTO v_result;

    RETURN v_result;
END;
$$;
