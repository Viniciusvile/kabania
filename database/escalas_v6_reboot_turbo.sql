-- 💣 REBOOT TOTAL & TURBO PERFORMANCE (OBSIDIAN ARCHITECTURE)
-- Este script APAGA os dados de escalas para começar do zero com performance máxima O(1).

-- 0. GARANTIR COLUNAS (BULLETPROOF SCHEMAS)
ALTER TABLE public.shifts ADD COLUMN IF NOT EXISTS intelligence_metadata JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.work_activities ADD COLUMN IF NOT EXISTS required_skills TEXT[] DEFAULT '{}'::text[];
ALTER TABLE public.employee_profiles ADD COLUMN IF NOT EXISTS skills TEXT[] DEFAULT '{}'::text[];
ALTER TABLE public.employee_profiles ADD COLUMN IF NOT EXISTS performance_notes TEXT;
ALTER TABLE public.service_requests ADD COLUMN IF NOT EXISTS client_unit TEXT;

-- 0.1 LIMPEZA DE DADOS (CLEAN SLATE)
TRUNCATE TABLE public.shift_assignments CASCADE;
TRUNCATE TABLE public.shift_calls CASCADE;
TRUNCATE TABLE public.shifts CASCADE;

-- 1. OTIMIZAÇÃO DA VIEW (JOIN EM VEZ DE SUBQUERIES)
-- Criando uma view que já traz contagens pré-calculadas via JOINS
DROP VIEW IF EXISTS public.view_shifts_standard;
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
    wa.required_role,
    wa.required_skills,
    COALESCE(ac.assigned_count, 0) as assigned_count,
    COALESCE(cc.total_calls, 0) as calls_count,
    COALESCE(cc.open_calls, 0) as open_calls_count
FROM public.shifts s
LEFT JOIN public.work_environments we ON s.environment_id = we.id
LEFT JOIN public.work_activities wa ON s.activity_id = wa.id
LEFT JOIN assignment_counts ac ON ac.shift_id = s.id
LEFT JOIN call_counts cc ON cc.shift_id = s.id;

-- 2. FUNÇÃO DE STATS OTIMIZADA
CREATE OR REPLACE FUNCTION get_shift_stats_optimized(p_company_id TEXT)
RETURNS JSON AS $$
DECLARE
    v_total INT;
    v_open INT;
    v_active INT;
    v_concluded_num INT;
    v_concluded_total INT;
BEGIN
    SELECT count(*) INTO v_total FROM public.shifts WHERE company_id = p_company_id;
    SELECT count(*) INTO v_open FROM public.shifts WHERE company_id = p_company_id AND status = 'scheduled';
    SELECT count(*) INTO v_active FROM public.shifts WHERE company_id = p_company_id AND status = 'active';
    SELECT count(*) INTO v_concluded_num FROM public.shifts WHERE company_id = p_company_id AND status = 'completed';
    
    RETURN json_build_object(
        'total', v_total,
        'open', v_open,
        'inProgress', v_active,
        'concluded', v_concluded_num || '/' || v_total
    );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- 3. RPC: TURBO DASHBOARD LOADER V2 (FIXED & O(1))
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

    -- 3. Employees (Fix Join ID)
    SELECT json_agg(e) INTO v_employees
    FROM (
        SELECT ep.*, p.name, p.avatar_url, p.email
        FROM public.employee_profiles ep
        JOIN public.profiles p ON p.user_id::text = ep.profile_id::text
        WHERE ep.company_id = p_company_id
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
