-- ============================================================================
-- Calendar Integrations Setup
-- ============================================================================
-- Tabela para configurações de integração com calendários externos

CREATE TABLE IF NOT EXISTS public.calendar_integrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id TEXT NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    
    -- Google Calendar Configuration
    google_calendar_enabled BOOLEAN DEFAULT false,
    google_calendar_access_token TEXT,
    google_calendar_refresh_token TEXT,
    google_calendar_token_expiry TIMESTAMPTZ,
    
    -- Microsoft Outlook Configuration
    outlook_enabled BOOLEAN DEFAULT false,
    outlook_access_token TEXT,
    outlook_refresh_token TEXT,
    outlook_token_expiry TIMESTAMPTZ,
    
    -- Sync Settings
    sync_direction TEXT DEFAULT 'bidirectional' CHECK (sync_direction IN ('bidirectional', 'kabania_to_calendar', 'calendar_to_kabania')),
    sync_interval INTEGER DEFAULT 30, -- minutes
    last_sync TIMESTAMPTZ,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    -- Constraints
    UNIQUE(company_id)
);

-- Enable Row Level Security
ALTER TABLE public.calendar_integrations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own company's calendar integrations"
    ON public.calendar_integrations
    FOR SELECT
    USING (
        company_id IN (
            SELECT id FROM public.companies 
            WHERE id::text = (SELECT current_setting('request.jwt.claims', true)::json->>'company_id')
        )
        OR
        auth.uid() IN (
            SELECT auth.uid FROM public.profiles 
            WHERE role = 'admin' AND company_id = public.calendar_integrations.company_id
        )
    );

CREATE POLICY "Admins can manage own company's calendar integrations"
    ON public.calendar_integrations
    FOR ALL
    USING (
        auth.uid() IN (
            SELECT auth.uid FROM public.profiles 
            WHERE role = 'admin' AND company_id = public.calendar_integrations.company_id
        )
    );

-- Add calendar event ID columns to activities table for tracking
ALTER TABLE public.activities 
ADD COLUMN IF NOT EXISTS google_event_id TEXT,
ADD COLUMN IF NOT EXISTS outlook_event_id TEXT;

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_calendar_integrations_company_id 
    ON public.calendar_integrations(company_id);

CREATE INDEX IF NOT EXISTS idx_activities_google_event_id 
    ON public.activities(google_event_id);

CREATE INDEX IF NOT EXISTS idx_activities_outlook_event_id 
    ON public.activities(outlook_event_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_calendar_integrations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER calendar_integrations_updated_at_trigger
    BEFORE UPDATE ON public.calendar_integrations
    FOR EACH ROW
    EXECUTE FUNCTION update_calendar_integrations_updated_at();

-- Insert initial configuration for existing companies
INSERT INTO public.calendar_integrations (company_id, google_calendar_enabled, outlook_enabled, sync_direction, sync_interval)
SELECT id, false, false, 'bidirectional', 30
FROM public.companies
WHERE id NOT IN (SELECT company_id FROM public.calendar_integrations)
ON CONFLICT (company_id) DO NOTHING;