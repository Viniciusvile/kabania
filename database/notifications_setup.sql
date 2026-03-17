-- Migração para criar o sistema de Notificações
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id TEXT REFERENCES public.companies(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- Se null, transmite para toda a empresa
    type TEXT NOT NULL, -- 'system', 'urgent', 'kanban_done'
    content TEXT NOT NULL,
    read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Habilitar RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso
DROP POLICY IF EXISTS "Usuários podem ver notificações da sua empresa" ON public.notifications;
CREATE POLICY "Usuários podem ver notificações da sua empresa"
    ON public.notifications FOR SELECT
    USING (
        company_id IN (
            SELECT company_id FROM public.profiles WHERE id = auth.uid()
        )
        AND (user_id IS NULL OR user_id = auth.uid())
    );

DROP POLICY IF EXISTS "Qualquer usuário autenticado pode criar notificações" ON public.notifications;
CREATE POLICY "Qualquer usuário autenticado pode criar notificações"
    ON public.notifications FOR INSERT
    WITH CHECK (
        company_id IN (
            SELECT company_id FROM public.profiles WHERE id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Usuários podem marcar suas notificações como lidas" ON public.notifications;
CREATE POLICY "Usuários podem marcar suas notificações como lidas"
    ON public.notifications FOR UPDATE
    USING (
        user_id = auth.uid()
    );

-- Habilitar Realtime para esta tabela (Precisa ser feito na interface do Supabase ou via instrução SQL abaixo se suportado)
alter publication supabase_realtime add table public.notifications;
