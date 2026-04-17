-- ════════════════════════════════════════════════════════════════════
-- KABANIA — Project Management (Gantt) Module
-- Tables prefixed pm_ to avoid collision with the existing `projects`
-- table used by the Workspace/Kanban project switcher.
-- ════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS pm_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id TEXT REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT DEFAULT 'active', -- active, paused, completed, cancelled
  color TEXT DEFAULT '#04D94F',
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pm_phases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES pm_projects(id) ON DELETE CASCADE,
  company_id TEXT REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  order_index INT NOT NULL DEFAULT 0,
  color TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pm_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phase_id UUID REFERENCES pm_phases(id) ON DELETE CASCADE,
  project_id UUID REFERENCES pm_projects(id) ON DELETE CASCADE,
  company_id TEXT REFERENCES companies(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  assignee_email TEXT,
  start_date DATE,
  end_date DATE,
  status TEXT DEFAULT 'pending', -- pending, in_progress, completed, blocked
  depends_on UUID[] DEFAULT '{}',
  kanban_card_id UUID,
  order_index INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pm_projects_company ON pm_projects(company_id);
CREATE INDEX IF NOT EXISTS idx_pm_phases_project ON pm_phases(project_id);
CREATE INDEX IF NOT EXISTS idx_pm_tasks_project ON pm_tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_pm_tasks_phase ON pm_tasks(phase_id);

ALTER TABLE pm_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE pm_phases   ENABLE ROW LEVEL SECURITY;
ALTER TABLE pm_tasks    ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS pm_projects_company_access ON pm_projects;
CREATE POLICY pm_projects_company_access ON pm_projects
  FOR ALL USING (
    company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid() OR user_id = auth.uid())
  ) WITH CHECK (
    company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid() OR user_id = auth.uid())
  );

DROP POLICY IF EXISTS pm_phases_company_access ON pm_phases;
CREATE POLICY pm_phases_company_access ON pm_phases
  FOR ALL USING (
    company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid() OR user_id = auth.uid())
  ) WITH CHECK (
    company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid() OR user_id = auth.uid())
  );

DROP POLICY IF EXISTS pm_tasks_company_access ON pm_tasks;
CREATE POLICY pm_tasks_company_access ON pm_tasks
  FOR ALL USING (
    company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid() OR user_id = auth.uid())
  ) WITH CHECK (
    company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid() OR user_id = auth.uid())
  );

-- ───────────────────────── REALTIME (optional) ─────────────────────────
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE pm_projects;
    EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE pm_phases;
    EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE pm_tasks;
    EXCEPTION WHEN duplicate_object THEN NULL; END;
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
