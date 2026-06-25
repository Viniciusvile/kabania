-- Create sent_emails table
CREATE TABLE IF NOT EXISTS public.sent_emails (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id TEXT NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    sender TEXT NOT NULL,
    recipient TEXT NOT NULL,
    subject TEXT NOT NULL,
    body TEXT NOT NULL,
    tags TEXT[] DEFAULT '{}',
    category TEXT,
    summary TEXT,
    tone TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.sent_emails ENABLE ROW LEVEL SECURITY;

-- 1. Policies for select (view sent emails of user's company)
DROP POLICY IF EXISTS "Users can view company emails" ON public.sent_emails;
CREATE POLICY "Users can view company emails" ON public.sent_emails
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.email = auth.jwt()->>'email' 
            AND profiles.company_id = sent_emails.company_id
        )
    );

-- 2. Policies for insert (insert sent emails for user's company)
DROP POLICY IF EXISTS "Users can insert company emails" ON public.sent_emails;
CREATE POLICY "Users can insert company emails" ON public.sent_emails
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.email = auth.jwt()->>'email' 
            AND profiles.company_id = sent_emails.company_id
        )
    );

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_sent_emails_company_id ON public.sent_emails(company_id);
CREATE INDEX IF NOT EXISTS idx_sent_emails_created_at ON public.sent_emails(created_at DESC);
