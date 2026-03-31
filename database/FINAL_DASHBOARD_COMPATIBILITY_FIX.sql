-- ============================================================================
-- 🛠️ FIX FINAL: COMPATIBILIDADE DE COLUNAS NO DASHBOARD
--=============================================================================
-- Este script resolve o erro 400 "column id does not exist" restaurando a visibilidade.

-- 1. Reparar a Função de Segurança (Sem dependência de coluna 'id' no perfil)
CREATE OR REPLACE FUNCTION public.check_company_access(target_company_id TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  IF target_company_id IS NULL THEN RETURN FALSE; END IF;
  
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    -- Mudança Cirúrgica: Usa apenas 'user_id' que é a chave garantida no seu banco
    WHERE user_id::text = auth.uid()::text
    AND company_id::text = target_company_id::text
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. Atualizar o Carregador do Dashboard (v2 e v3)
-- Garante que o JSON de retorno use mapeamentos válidos.
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

    -- 2. Shifts (Com tratamento nulo)
    SELECT json_agg(s) INTO v_shifts
    FROM (
        SELECT * FROM view_shifts_standard 
        WHERE company_id = p_company_id 
        AND start_time >= p_start_time 
        AND end_time <= p_end_time
        ORDER BY start_time
    ) s;

    -- 3. Funcionários (Corrigido para evitar erro de 'id' inexistente)
    SELECT json_agg(e) INTO v_employees
    FROM (
        -- Selecionamos colunas explícitas para evitar conflitos de 'id'
        SELECT 
            ep.profile_id as shift_profile_id, 
            ep.company_id, 
            ep.role, 
            p.name, 
            p.avatar_url, 
            p.email
        FROM public.employee_profiles ep
        JOIN public.profiles p ON p.user_id::text = ep.profile_id::text
        WHERE ep.company_id = p_company_id
    ) e;

    -- 4. Ambientes
    SELECT json_agg(env) INTO v_environments
    FROM (SELECT id, name FROM public.work_environments WHERE company_id = p_company_id) env;

    -- 5. Atividades
    SELECT json_agg(act) INTO v_activities
    FROM (SELECT id, name, environment_id FROM public.work_activities WHERE company_id = p_company_id) act;

    -- 6. Requisições (Activities)
    SELECT json_agg(req) INTO v_pending_reqs
    FROM (SELECT id, location as name, status FROM public.activities WHERE company_id = p_company_id) req;

    -- 7. Service Requests
    SELECT json_agg(sr) INTO v_service_reqs
    FROM (SELECT id, customer_name, status FROM public.service_requests WHERE company_id = p_company_id) sr;

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
