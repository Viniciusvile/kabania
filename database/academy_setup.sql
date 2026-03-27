-- ============================================
-- Kabania Academy Tables
-- ============================================

-- Trail (learning path)
CREATE TABLE IF NOT EXISTS public.academy_trails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'geral',
  cover_emoji TEXT DEFAULT '🎓',
  is_published BOOLEAN NOT NULL DEFAULT false,
  estimated_duration INT DEFAULT 30,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Module (lesson inside a trail)
CREATE TABLE IF NOT EXISTS public.academy_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trail_id UUID NOT NULL REFERENCES public.academy_trails(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  order_index INT NOT NULL DEFAULT 0,
  kb_item_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Progress (per user, per module)
CREATE TABLE IF NOT EXISTS public.academy_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email TEXT NOT NULL,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  trail_id UUID NOT NULL REFERENCES public.academy_trails(id) ON DELETE CASCADE,
  module_id UUID NOT NULL REFERENCES public.academy_modules(id) ON DELETE CASCADE,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_email, module_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_academy_trails_company ON public.academy_trails(company_id);
CREATE INDEX IF NOT EXISTS idx_academy_modules_trail ON public.academy_modules(trail_id);
CREATE INDEX IF NOT EXISTS idx_academy_progress_user ON public.academy_progress(user_email, company_id);

-- RLS
ALTER TABLE public.academy_trails ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academy_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academy_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "academy_trails_all" ON public.academy_trails FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "academy_modules_all" ON public.academy_modules FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "academy_progress_all" ON public.academy_progress FOR ALL USING (true) WITH CHECK (true);

-- Auto-update trigger for trails
CREATE OR REPLACE FUNCTION update_academy_trail_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_academy_trail_updated_at ON public.academy_trails;
CREATE TRIGGER trigger_academy_trail_updated_at
  BEFORE UPDATE ON public.academy_trails
  FOR EACH ROW EXECUTE FUNCTION update_academy_trail_updated_at();
