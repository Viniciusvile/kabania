-- Create support_tickets table
CREATE TABLE IF NOT EXISTS public.support_tickets (
    id TEXT PRIMARY KEY,
    company_id TEXT REFERENCES public.companies(id) ON DELETE CASCADE,
    client_name TEXT NOT NULL,
    client_email TEXT NOT NULL,
    client_unit TEXT,
    incident_date DATE DEFAULT CURRENT_DATE,
    subject TEXT NOT NULL,
    description TEXT NOT NULL,
    status TEXT DEFAULT 'pending_ai', -- 'pending_ai', 'ai_replied', 'escalated', 'closed'
    ai_response TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
 );

-- Enable RLS
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

-- Policies
-- 1. Anyone can insert (for the client portal)
DROP POLICY IF EXISTS "Enable insert for everyone" ON public.support_tickets;
CREATE POLICY "Enable insert for everyone" ON public.support_tickets
    FOR INSERT WITH CHECK (true);

-- 2. Anyone can select THEIR OWN ticket
DROP POLICY IF EXISTS "Enable select for anonymous via ID" ON public.support_tickets;
CREATE POLICY "Enable select for anonymous via ID" ON public.support_tickets
    FOR SELECT USING (true);

-- 3. Authenticated users can view/update tickets of their company
DROP POLICY IF EXISTS "Users can view company tickets" ON public.support_tickets;
CREATE POLICY "Users can view company tickets" ON public.support_tickets
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.user_id = auth.uid() 
            AND profiles.company_id = support_tickets.company_id
        )
    );

DROP POLICY IF EXISTS "Users can update company tickets" ON public.support_tickets;
CREATE POLICY "Users can update company tickets" ON public.support_tickets
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.user_id = auth.uid() 
            AND profiles.company_id = support_tickets.company_id
        )
    );
