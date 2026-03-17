-- MIGRATION TOTAL (Segura para rodar várias vezes):
-- 1. Garante que as colunas novas existam
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='support_tickets' AND column_name='client_unit') THEN
        ALTER TABLE public.support_tickets ADD COLUMN client_unit TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='support_tickets' AND column_name='incident_date') THEN
        ALTER TABLE public.support_tickets ADD COLUMN incident_date DATE DEFAULT CURRENT_DATE;
    END IF;
END $$;

-- 2. Recria as Políticas de Segurança sem dar erro de "Already Exists"
DROP POLICY IF EXISTS "Enable insert for everyone" ON public.support_tickets;
CREATE POLICY "Enable insert for everyone" ON public.support_tickets
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Enable select for anonymous via ID" ON public.support_tickets;
CREATE POLICY "Enable select for anonymous via ID" ON public.support_tickets
    FOR SELECT USING (true);
