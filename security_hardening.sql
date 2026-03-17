-- 🛡️ Security Hardening: Row Level Security (RLS) Recommendations
-- apply these in the Supabase SQL Editor to enforce data isolation

-- 1. Profiles: Only own profile readable/writable
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
CREATE POLICY "Users can view their own profile" ON profiles
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE USING (auth.uid() = user_id);

-- 2. Companies: Members only
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view their company" ON companies;
CREATE POLICY "Members can view their company" ON companies
  FOR SELECT USING (
    id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid())
  );

-- 3. Projects: Strict company isolation
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Project company isolation" ON projects;
CREATE POLICY "Project company isolation" ON projects
  FOR ALL USING (
    company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid())
  );

-- 4. Knowledge Base: Strict company isolation
ALTER TABLE knowledge_base ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Knowledge base company isolation" ON knowledge_base;
CREATE POLICY "Knowledge base company isolation" ON knowledge_base
  FOR ALL USING (
    company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid())
  );

-- 5. Kanban Tasks: Project/Company isolation
ALTER TABLE kanban_tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tasks project isolation" ON kanban_tasks;
CREATE POLICY "Tasks project isolation" ON kanban_tasks
  FOR ALL USING (
    project_id IN (
      SELECT id FROM projects WHERE company_id IN (
        SELECT company_id FROM profiles WHERE user_id = auth.uid()
      )
    )
  );
