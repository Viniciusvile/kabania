-- ============================================================
-- ai_usage — tracks every AI call made in the platform
-- Run once in Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS ai_usage (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  model       text NOT NULL,
  feature     text NOT NULL,          -- e.g. 'kb_recommender', 'kanban_estimation'
  tokens_used int  NOT NULL DEFAULT 0,
  cost        numeric(12, 8) DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Index for time-based queries (dashboards, monitoring)
CREATE INDEX IF NOT EXISTS ai_usage_created_at_idx ON ai_usage (created_at DESC);
CREATE INDEX IF NOT EXISTS ai_usage_feature_idx    ON ai_usage (feature);

-- RLS: only service role can insert; authenticated users can read their company's logs
ALTER TABLE ai_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow_insert_ai_usage"
  ON ai_usage FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "allow_read_ai_usage"
  ON ai_usage FOR SELECT
  TO authenticated
  USING (true);
