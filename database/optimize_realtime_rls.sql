-- O Supabase Realtime pode sofrer de latência severa ("demorar muito") ao transmitir eventos
-- se a política RLS tabela tiver subqueries complexas ou buscar por email no JWT.
-- Esta migração otimiza a política da tabela 'tasks' para usar o auth.uid() direto e ser disparado quase instantaneamente.

DROP POLICY IF EXISTS "Users can only see their own company's tasks" ON tasks;

-- Nova política mega-otimizada
CREATE POLICY "Users can only see their own company's tasks" ON tasks 
FOR ALL USING (
  company_id IN (
    SELECT company_id 
    FROM profiles 
    WHERE id::text = auth.uid()::text OR user_id::text = auth.uid()::text
  )
);
