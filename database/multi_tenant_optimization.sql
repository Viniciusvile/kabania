-- OTIMIZAÇÃO AVANÇADA PARA MULTA-TENANCY (ZERO LAG)
-- Este script implementa índices compostos e funções de segurança cacheadas
-- para garantir que o sistema escale para centenas de empresas sem perda de performance.

-- 1. FUNÇÃO DE SEGURANÇA OTIMIZADA (RLS CACHE)
-- Esta função é muito mais rápida do que subqueries JOIN em cada política RLS.
CREATE OR REPLACE FUNCTION public.check_company_access(target_company_id TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE (id::text = auth.uid()::text OR user_id::text = auth.uid()::text)
    AND company_id = target_company_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. ÍNDICES COMPOSTOS (COMPOSITE INDEXES)
-- Permite que o Postgres pule 99% das linhas de outras empresas instantaneamente.

-- Projetos
CREATE INDEX IF NOT EXISTS idx_projects_multi_tenant ON public.projects(company_id, id);

-- Tarefas
CREATE INDEX IF NOT EXISTS idx_tasks_multi_tenant ON public.tasks(company_id, project_id, column_id);
CREATE INDEX IF NOT EXISTS idx_tasks_company_id ON public.tasks(company_id);

-- Atividades
CREATE INDEX IF NOT EXISTS idx_activities_multi_tenant ON public.activities(company_id, created DESC);

-- Notificações (Crítico para Realtime)
CREATE INDEX IF NOT EXISTS idx_notifications_multi_tenant ON public.notifications(company_id, user_id, read) WHERE read = false;

-- Base de Conhecimento
CREATE INDEX IF NOT EXISTS idx_kb_multi_tenant ON public.knowledge_base(company_id);

-- Clientes
CREATE INDEX IF NOT EXISTS idx_customers_multi_tenant ON public.customers(company_id, name);

-- Audit Logs
CREATE INDEX IF NOT EXISTS idx_audit_logs_multi_tenant ON public.audit_logs(company_id, created_at DESC);

-- Colaboradores
CREATE INDEX IF NOT EXISTS idx_collaborators_multi_tenant ON public.collaborators(company_id, email);

-- 3. ANALYZE
-- Força o Postgres a atualizar as estatísticas para usar os novos índices imediatamente.
ANALYZE public.projects;
ANALYZE public.tasks;
ANALYZE public.activities;
ANALYZE public.notifications;
ANALYZE public.knowledge_base;
ANALYZE public.customers;
ANALYZE public.audit_logs;
ANALYZE public.collaborators;
