-- 🛡️ REPARO: SEGURANÇA DE SOLICITAÇÕES E ATIVIDADES
-- ============================================================================

-- 1. Habilitar RLS nas tabelas envolvidas
ALTER TABLE IF EXISTS public.service_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.activities ENABLE ROW LEVEL SECURITY;

-- 2. Limpar políticas antigas
DROP POLICY IF EXISTS "RLS_ServiceRequests" ON public.service_requests;
DROP POLICY IF EXISTS "RLS_Activities" ON public.activities;

-- 3. Criar políticas universais robustas
CREATE POLICY "RLS_ServiceRequests" ON public.service_requests
    FOR ALL TO authenticated USING (check_company_access(company_id::text));

CREATE POLICY "RLS_Activities" ON public.activities
    FOR ALL TO authenticated USING (check_company_access(company_id::text));

-- 4. Índices para performance instantânea
CREATE INDEX IF NOT EXISTS idx_sr_company_id ON public.service_requests(company_id);
CREATE INDEX IF NOT EXISTS idx_activities_company_id ON public.activities(company_id);
CREATE INDEX IF NOT EXISTS idx_activities_status ON public.activities(status);
CREATE INDEX IF NOT EXISTS idx_activities_created ON public.activities(created);

ANALYZE public.service_requests;
ANALYZE public.activities;
