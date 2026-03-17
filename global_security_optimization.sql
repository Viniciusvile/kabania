-- OTMIZAÇÃO GLOBAL DE SEGURANÇA E PERFORMANCE
-- Substitui todas as políticas RLS pesadas baseadas em email por políticas indexadas baseadas em UID.
-- Isso elimina o gargalo de latência do Supabase Realtime e deixa o sistema instantâneo.

-- 1. Projetos
DROP POLICY IF EXISTS "Users can only see their own company's projects" ON public.projects;
CREATE POLICY "Users can only see their own company's projects" ON public.projects 
FOR ALL USING (
  company_id IN (
    SELECT company_id FROM public.profiles WHERE id::text = auth.uid()::text OR user_id::text = auth.uid()::text
  )
);

-- 2. Atividades
DROP POLICY IF EXISTS "Users can only see their own company's activities" ON public.activities;
CREATE POLICY "Users can only see their own company's activities" ON public.activities 
FOR ALL USING (
  company_id IN (
    SELECT company_id FROM public.profiles WHERE id::text = auth.uid()::text OR user_id::text = auth.uid()::text
  )
);

-- 3. Base de Conhecimento
DROP POLICY IF EXISTS "Users can only see their own company's knowledge" ON public.knowledge_base;
CREATE POLICY "Users can only see their own company's knowledge" ON public.knowledge_base 
FOR ALL USING (
  company_id IN (
    SELECT company_id FROM public.profiles WHERE id::text = auth.uid()::text OR user_id::text = auth.uid()::text
  )
);

-- 4. Clientes (CRM)
DROP POLICY IF EXISTS "Usuários podem ver clientes da própria empresa" ON public.customers;
CREATE POLICY "Usuários podem ver clientes da própria empresa" ON public.customers 
FOR ALL USING (
  company_id IN (
    SELECT company_id FROM public.profiles WHERE id::text = auth.uid()::text OR user_id::text = auth.uid()::text
  )
);

-- 5. Histórico e Relatórios
DROP POLICY IF EXISTS "Usuários podem ver logs da sua empresa" ON public.audit_logs;
CREATE POLICY "Usuários podem ver logs da sua empresa" ON public.audit_logs 
FOR SELECT USING (
  company_id IN (
    SELECT company_id FROM public.profiles WHERE id::text = auth.uid()::text OR user_id::text = auth.uid()::text
  )
);

-- 6. Colaboradores Existentes
DROP POLICY IF EXISTS "Usuários podem ver colaboradores da própria empresa" ON public.collaborators;
CREATE POLICY "Usuários podem ver colaboradores da própria empresa" ON public.collaborators 
FOR ALL USING (
  company_id IN (
    SELECT company_id FROM public.profiles WHERE id::text = auth.uid()::text OR user_id::text = auth.uid()::text
  )
);

-- 7. Supore de Tickets
DROP POLICY IF EXISTS "Usuários podem ver tickets da própria empresa" ON public.support_tickets;
CREATE POLICY "Usuários podem ver tickets da própria empresa" ON public.support_tickets 
FOR ALL USING (
  company_id IN (
    SELECT company_id FROM public.profiles WHERE id::text = auth.uid()::text OR user_id::text = auth.uid()::text
  )
);
