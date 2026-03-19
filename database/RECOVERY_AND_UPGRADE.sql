-- 🚀 RECOVERY & FULL UPGRADE (KABANIA FINAL)
-- Execute este script INTEGRALMENTE no SQL Editor do seu Supabase para resolver todos os erros de uma vez.

-- 1. SUPORTE A ATRIBUIÇÃO DE COLABORADORES
ALTER TABLE public.shift_assignments 
ADD COLUMN IF NOT EXISTS collaborator_id UUID REFERENCES public.collaborators(id) ON DELETE CASCADE;

ALTER TABLE public.shift_assignments 
ALTER COLUMN employee_id DROP NOT NULL;

-- 2. SUPORTE A METADADOS DE INTELIGÊNCIA
ALTER TABLE public.shifts 
ADD COLUMN IF NOT EXISTS intelligence_metadata JSONB DEFAULT '{}'::jsonb;

-- 3. REMOVER RESTRIÇÃO DE UNICIDADE ANTIGA E CRIAR NOVA (PARA ACEITAR DOIS TIPOS DE PESSOAL)
ALTER TABLE public.shift_assignments DROP CONSTRAINT IF EXISTS shift_assignments_shift_id_employee_id_key;

CREATE UNIQUE INDEX IF NOT EXISTS idx_shift_assignments_unique_employee 
ON public.shift_assignments (shift_id, employee_id) 
WHERE employee_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_shift_assignments_unique_collaborator 
ON public.shift_assignments (shift_id, collaborator_id) 
WHERE collaborator_id IS NOT NULL;

-- 4. ATUALIZAR VIEW DE ESCALAS (JOIN OTIMIZADO)
DROP VIEW IF EXISTS public.view_shifts_standard CASCADE;
CREATE OR REPLACE VIEW view_shifts_standard AS
WITH assignment_counts AS (
    SELECT shift_id, count(*) as assigned_count 
    FROM public.shift_assignments 
    GROUP BY shift_id
),
call_counts AS (
    SELECT 
        shift_id, 
        count(*) as total_calls,
        count(*) FILTER (WHERE status = 'open') as open_calls
    FROM public.shift_calls 
    GROUP BY shift_id
)
SELECT 
    s.*,
    we.name as environment_name,
    wa.name as activity_name,
    sr.customer_name as service_customer,
    sr.client_unit as service_unit,
    wa.required_role,
    wa.required_skills,
    COALESCE(ac.assigned_count, 0) as assigned_count,
    COALESCE(cc.total_calls, 0) as calls_count,
    COALESCE(cc.open_calls, 0) as open_calls_count
FROM public.shifts s
LEFT JOIN public.work_environments we ON s.environment_id = we.id
LEFT JOIN public.work_activities wa ON s.activity_id = wa.id
LEFT JOIN public.service_requests sr ON (CASE WHEN s.service_request_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN s.service_request_id::uuid ELSE NULL END) = sr.id
LEFT JOIN assignment_counts ac ON ac.shift_id = s.id
LEFT JOIN call_counts cc ON cc.shift_id = s.id;

-- 5. ATUALIZAR FUNÇÃO DASHBOARD COM SUPORTE TOTAL
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

    -- 2. Shifts com Nested Assignments
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

    -- 3. Employees Unificados (Inference ready)
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

    -- 4. Collections
    SELECT json_agg(env) INTO v_environments FROM (SELECT id, name FROM public.work_environments WHERE company_id = p_company_id) env;
    SELECT json_agg(act) INTO v_activities FROM (SELECT id, name, environment_id, required_skills, required_role FROM public.work_activities WHERE company_id = p_company_id) act;
    SELECT json_agg(req) INTO v_pending_reqs FROM (SELECT id, location as name, description, status, created as created_at FROM public.activities WHERE company_id = p_company_id) req;
    SELECT json_agg(sr) INTO v_service_reqs FROM (SELECT id, customer_name, client_unit, service_type, status, created_at FROM public.service_requests WHERE company_id = p_company_id) sr;

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
