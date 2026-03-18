-- 🚀 Otimização de Performance para o Módulo de Escalas
-- Este script adiciona índices e estruturas para acelerar as consultas do dashboard de escalas.

-- 1. ÍNDICES DE ALTA PERFORMANCE
-- Acelera a busca por escalas dentro de um período específico para uma empresa
CREATE INDEX IF NOT EXISTS idx_shifts_query_performance 
ON public.shifts (company_id, start_time, end_time);

-- Acelera a vinculação de funcionários e contagem de chamados
CREATE INDEX IF NOT EXISTS idx_assignments_optimization ON public.shift_assignments (shift_id);
CREATE INDEX IF NOT EXISTS idx_calls_optimization ON public.shift_calls (shift_id);

-- 2. VIEW PARA CARREGAMENTO RÁPIDO
-- Consolida dados básicos para evitar joins complexos no frontend
CREATE OR REPLACE VIEW view_shifts_standard AS
SELECT 
    s.*,
    we.name as environment_name,
    wa.name as activity_name,
    wa.required_role,
    (SELECT count(*) FROM public.shift_assignments sa WHERE sa.shift_id = s.id) as assigned_count,
    (SELECT count(*) FROM public.shift_calls sc WHERE sc.shift_id = s.id) as calls_count,
    (SELECT count(*) FROM public.shift_calls sc WHERE sc.shift_id = s.id AND sc.status = 'open') as open_calls_count
FROM public.shifts s
LEFT JOIN public.work_environments we ON s.environment_id = we.id
LEFT JOIN public.work_activities wa ON s.activity_id = wa.id;

-- 3. FUNÇÃO DE ESTATÍSTICAS NO SERVIDOR (Agregação Turbo)
CREATE OR REPLACE FUNCTION get_shift_stats_optimized(p_company_id TEXT)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'total', count(*),
        'open', count(*) FILTER (WHERE status = 'open' OR status = 'scheduled'),
        'inProgress', count(*) FILTER (WHERE status = 'in_progress' OR status = 'active'),
        'concluded', (count(*) FILTER (WHERE status = 'completed')) || '/' || count(*)
    ) INTO result
    FROM public.shifts
    WHERE company_id = p_company_id;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. PERMISSÕES
GRANT SELECT ON view_shifts_standard TO authenticated;
GRANT EXECUTE ON FUNCTION get_shift_stats_optimized(TEXT) TO authenticated;
