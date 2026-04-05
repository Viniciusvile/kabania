-- Script para criar a tabela calendar_integrations no Supabase
-- Cole e execute isso no "SQL Editor" do seu painel do Supabase

CREATE TABLE IF NOT EXISTS public.calendar_integrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id TEXT NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    google_calendar_enabled BOOLEAN DEFAULT false,
    google_calendar_access_token TEXT,
    outlook_enabled BOOLEAN DEFAULT false,
    outlook_access_token TEXT,
    sync_direction TEXT DEFAULT 'bidirectional',
    sync_interval INTEGER DEFAULT 30,
    last_sync TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraint para garantir apenas uma configuração por empresa
    UNIQUE(company_id)
);

-- Ativar RLS (Row Level Security)
ALTER TABLE public.calendar_integrations ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso:
-- Permitir select, insert, update e delete apenas para instâncias da mesma company_id baseada no RLS profile.
CREATE POLICY "Permitir acesso à calendar_integrations baseado na company_id" 
    ON public.calendar_integrations
    FOR ALL
    USING (
        auth.uid() IN (
            SELECT p.id FROM public.profiles p WHERE p.company_id = calendar_integrations.company_id
        )
    );
