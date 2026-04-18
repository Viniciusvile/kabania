-- ============================================================
-- kanban_estimate_cache — server-side fallback for estimation cache
-- The primary cache is localStorage (client-side, TTL 48h).
-- This table is an optional server-side backup.
-- Run once in Supabase SQL Editor if needed.
-- ============================================================

CREATE TABLE IF NOT EXISTS kanban_estimate_cache (
  card_hash   text PRIMARY KEY,        -- SHA-like key: task ID or title+desc hash
  estimate    text    NOT NULL,
  complexity  text    NOT NULL CHECK (complexity IN ('baixa', 'média', 'alta')),
  reasoning   text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Auto-expire rows older than 48 hours via a scheduled job or pg_cron
-- (Optional — the app uses localStorage as primary cache)
CREATE INDEX IF NOT EXISTS kanban_estimate_cache_created_idx
  ON kanban_estimate_cache (created_at DESC);

ALTER TABLE kanban_estimate_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow_all_kanban_estimate_cache"
  ON kanban_estimate_cache FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
