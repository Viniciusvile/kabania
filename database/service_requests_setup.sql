-- service_requests_setup.sql
-- 1. Create table for customer service requests
CREATE TABLE IF NOT EXISTS service_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id TEXT NOT NULL,
    customer_name TEXT NOT NULL,
    service_type TEXT NOT NULL,
    description TEXT,
    contact_info TEXT,
    origin TEXT DEFAULT 'portal', -- 'portal', 'manual'
    ai_summary TEXT,
    status TEXT DEFAULT 'pending', -- 'pending', 'accepted', 'rejected'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Enable Row Level Security
ALTER TABLE service_requests ENABLE ROW LEVEL SECURITY;

-- 3. Access Policies (Optimized)
-- We use a direct join check or a security definer function for maximum speed
DROP POLICY IF EXISTS "Users can view their company's service requests" ON service_requests;
CREATE POLICY "Users can view their company's service requests" ON service_requests
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.email = auth.jwt()->>'email' 
        AND profiles.company_id = service_requests.company_id
    )
);

DROP POLICY IF EXISTS "Users can manage their company's service requests" ON service_requests;
CREATE POLICY "Users can manage their company's service requests" ON service_requests
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.email = auth.jwt()->>'email' 
        AND profiles.company_id = service_requests.company_id
    )
);

-- 4. Index for performance
CREATE INDEX IF NOT EXISTS idx_service_requests_company_id_status ON service_requests(company_id, status);
CREATE INDEX IF NOT EXISTS idx_service_requests_created_at ON service_requests(created_at DESC);
