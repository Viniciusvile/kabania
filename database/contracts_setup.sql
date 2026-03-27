-- ============================================
-- Contracts Table for SLA Dashboard
-- ============================================

CREATE TABLE IF NOT EXISTS public.contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id TEXT NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  client TEXT NOT NULL,
  start_date DATE,
  end_date DATE,
  status TEXT NOT NULL DEFAULT 'Ativo',
  notes TEXT,
  sla_thresholds JSONB NOT NULL DEFAULT '{}',
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Row Level Security
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;

-- Policy: members of the same company can read contracts
CREATE POLICY "contracts_select" ON public.contracts
  FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM public.profiles WHERE id = auth.uid()
      UNION
      SELECT company_id FROM public.collaborators WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
  );

-- Policy: members of the same company can insert contracts
CREATE POLICY "contracts_insert" ON public.contracts
  FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM public.profiles WHERE id = auth.uid()
      UNION
      SELECT company_id FROM public.collaborators WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
  );

-- Policy: members of the same company can update contracts
CREATE POLICY "contracts_update" ON public.contracts
  FOR UPDATE
  USING (
    company_id IN (
      SELECT company_id FROM public.profiles WHERE id = auth.uid()
      UNION
      SELECT company_id FROM public.collaborators WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
  );

-- Policy: members of the same company can delete contracts
CREATE POLICY "contracts_delete" ON public.contracts
  FOR DELETE
  USING (
    company_id IN (
      SELECT company_id FROM public.profiles WHERE id = auth.uid()
      UNION
      SELECT company_id FROM public.collaborators WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
  );

-- Index for fast lookup by company
CREATE INDEX IF NOT EXISTS idx_contracts_company_id ON public.contracts(company_id);

-- Trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_contracts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_contracts_updated_at ON public.contracts;
CREATE TRIGGER trigger_contracts_updated_at
  BEFORE UPDATE ON public.contracts
  FOR EACH ROW
  EXECUTE FUNCTION update_contracts_updated_at();
