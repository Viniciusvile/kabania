-- ============================================================
-- Shift Swap Marketplace
-- Run once in Supabase SQL Editor
-- ============================================================

-- Main swap offers table
CREATE TABLE IF NOT EXISTS shift_swaps (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id          text NOT NULL,
  offered_shift_id    uuid REFERENCES shifts(id) ON DELETE CASCADE NOT NULL,
  requested_shift_id  uuid REFERENCES shifts(id) ON DELETE SET NULL,  -- filled on match
  proposer_id         text NOT NULL,   -- user email of who posted the offer
  acceptor_id         text,            -- user email of who accepted
  status              text NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending','accepted','rejected','cancelled')),
  reason              text,
  desired_date        date,            -- optional: preferred date for the swap
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS shift_swaps_company_idx  ON shift_swaps (company_id, status);
CREATE INDEX IF NOT EXISTS shift_swaps_proposer_idx ON shift_swaps (proposer_id);

-- Manager approval audit log (optional)
CREATE TABLE IF NOT EXISTS shift_swap_audit (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  swap_id     uuid REFERENCES shift_swaps(id) ON DELETE CASCADE NOT NULL,
  approver_id text NOT NULL,
  decision    text NOT NULL CHECK (decision IN ('approved','denied')),
  comment     text,
  decided_at  timestamptz NOT NULL DEFAULT now()
);

-- Trigger to update updated_at automatically
CREATE OR REPLACE FUNCTION set_swap_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_swap_updated_at ON shift_swaps;
CREATE TRIGGER trg_swap_updated_at
BEFORE UPDATE ON shift_swaps
FOR EACH ROW EXECUTE FUNCTION set_swap_updated_at();

-- Trigger: when a swap is accepted, exchange the shift assignments
CREATE OR REPLACE FUNCTION perform_shift_swap()
RETURNS trigger AS $$
DECLARE
  proposer_assignment_id uuid;
  acceptor_assignment_id uuid;
  proposer_employee_id   uuid;
  acceptor_employee_id   uuid;
BEGIN
  IF NEW.status = 'accepted' AND OLD.status = 'pending' THEN
    -- Get the employee assigned to the offered shift (proposer's shift)
    SELECT id, collaborator_id INTO proposer_assignment_id, proposer_employee_id
    FROM shift_assignments
    WHERE shift_id = NEW.offered_shift_id
    LIMIT 1;

    -- Get the employee assigned to the requested shift (acceptor's shift)
    IF NEW.requested_shift_id IS NOT NULL THEN
      SELECT id, collaborator_id INTO acceptor_assignment_id, acceptor_employee_id
      FROM shift_assignments
      WHERE shift_id = NEW.requested_shift_id
      LIMIT 1;

      -- Swap the collaborators
      IF proposer_assignment_id IS NOT NULL AND acceptor_assignment_id IS NOT NULL THEN
        UPDATE shift_assignments SET collaborator_id = acceptor_employee_id
          WHERE id = proposer_assignment_id;
        UPDATE shift_assignments SET collaborator_id = proposer_employee_id
          WHERE id = acceptor_assignment_id;
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_shift_swap_accept ON shift_swaps;
CREATE TRIGGER trg_shift_swap_accept
AFTER UPDATE OF status ON shift_swaps
FOR EACH ROW WHEN (NEW.status = 'accepted')
EXECUTE FUNCTION perform_shift_swap();

-- RLS
ALTER TABLE shift_swaps      ENABLE ROW LEVEL SECURITY;
ALTER TABLE shift_swap_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "company_shift_swaps_all"
  ON shift_swaps FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "company_swap_audit_all"
  ON shift_swap_audit FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE shift_swaps;
