-- OTIMIZAÇÃO GLOBAL DE SEGURANÇA E PERFORMANCE (V2)
-- Substitui subqueries JOIN por uma função de segurança cacheada e índices compostos.
-- Isso garante performance O(1) mesmo com milhares de empresas no banco.

-- 1. Projetos
DROP POLICY IF EXISTS "Users can only see their own company's projects" ON public.projects;
CREATE POLICY "Users can only see their own company's projects" ON public.projects 
FOR ALL USING ( check_company_access(company_id) );

-- 2. Atividades
DROP POLICY IF EXISTS "Users can only see their own company's activities" ON public.activities;
CREATE POLICY "Users can only see their own company's activities" ON public.activities 
FOR ALL USING ( check_company_access(company_id) );

-- 3. Base de Conhecimento
DROP POLICY IF EXISTS "Users can only see their own company's knowledge" ON public.knowledge_base;
CREATE POLICY "Users can only see their own company's knowledge" ON public.knowledge_base 
FOR ALL USING ( check_company_access(company_id) );

-- 4. Clientes (CRM)
DROP POLICY IF EXISTS "Usuários podem ver clientes da própria empresa" ON public.customers;
CREATE POLICY "Usuários podem ver clientes da própria empresa" ON public.customers 
FOR ALL USING ( check_company_access(company_id) );

-- 5. Histórico e Relatórios
DROP POLICY IF EXISTS "Usuários podem ver logs da sua empresa" ON public.audit_logs;
CREATE POLICY "Usuários podem ver logs da sua empresa" ON public.audit_logs 
FOR SELECT USING ( check_company_access(company_id) );

-- 6. Colaboradores
DROP POLICY IF EXISTS "Usuários podem ver colaboradores da própria empresa" ON public.collaborators;
CREATE POLICY "Usuários podem ver colaboradores da própria empresa" ON public.collaborators 
FOR ALL USING ( check_company_access(company_id) );

-- 7. Suporte de Tickets
DROP POLICY IF EXISTS "Usuários podem ver tickets da própria empresa" ON public.support_tickets;
CREATE POLICY "Usuários podem ver tickets da própria empresa" ON public.support_tickets 
FOR ALL USING ( check_company_access(company_id) );

-- 8. Tarefas (Kanban) - ADICIONADO PARA PERFORMANCE EXTRA
DROP POLICY IF EXISTS "Users can only see their own company's tasks" ON public.tasks;
CREATE POLICY "Users can only see their own company's tasks" ON public.tasks 
FOR ALL USING ( check_company_access(company_id) );
