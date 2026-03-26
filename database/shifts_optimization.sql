-- =====================================================================================
-- OTIMIZAÇÃO DE PERFORMANCE DO MÓDULO DE ESCALAS (SHIFTS)
-- Execute este script no SQL Editor do Supabase para acelerar o carregamento.
-- =====================================================================================

-- 1. ÍNDICES PARA A TABELA DE ESCALAS (shifts)
-- Acelera filtros por company_id + período de tempo (a consulta mais comum do módulo)
CREATE INDEX IF NOT EXISTS idx_shifts_company_id
    ON public.shifts(company_id);

CREATE INDEX IF NOT EXISTS idx_shifts_company_start_time
    ON public.shifts(company_id, start_time DESC);

CREATE INDEX IF NOT EXISTS idx_shifts_status
    ON public.shifts(status);

CREATE INDEX IF NOT EXISTS idx_shifts_service_request_id
    ON public.shifts(service_request_id);

-- 2. ÍNDICES PARA ATRIBUIÇÕES DE FUNCIONÁRIOS (shift_assignments)
-- Acelera o JOIN com shifts e a busca de funcionários por escala
CREATE INDEX IF NOT EXISTS idx_shift_assignments_shift_id
    ON public.shift_assignments(shift_id);

CREATE INDEX IF NOT EXISTS idx_shift_assignments_employee_id
    ON public.shift_assignments(employee_id);

-- 3. ÍNDICES PARA COLABORADORES E PERFIS DE FUNCIONÁRIOS
CREATE INDEX IF NOT EXISTS idx_employee_profiles_company_id
    ON public.employee_profiles(company_id);

CREATE INDEX IF NOT EXISTS idx_collaborators_company_id
    ON public.collaborators(company_id);

-- 4. ÍNDICES PARA AMBIENTES E ATIVIDADES
CREATE INDEX IF NOT EXISTS idx_work_environments_company_id
    ON public.work_environments(company_id);

CREATE INDEX IF NOT EXISTS idx_work_activities_company_id
    ON public.work_activities(company_id);

-- 5. ÍNDICES PARA SERVICE REQUESTS (usado no painel de pendências)
CREATE INDEX IF NOT EXISTS idx_service_requests_company_id
    ON public.service_requests(company_id);

CREATE INDEX IF NOT EXISTS idx_service_requests_status
    ON public.service_requests(status);

-- 6. ANALYZE
-- Atualiza estatísticas do planejador para usar os novos índices imediatamente
ANALYZE public.shifts;
ANALYZE public.shift_assignments;
ANALYZE public.employee_profiles;
ANALYZE public.work_environments;
ANALYZE public.work_activities;
ANALYZE public.service_requests;
