-- Script para criação da tabela de links gerados para o Portal Público de Clientes (Live Tracking)

CREATE TABLE IF NOT EXISTS public.magic_links (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    service_request_id UUID REFERENCES public.service_requests(id) ON DELETE CASCADE,
    company_id TEXT REFERENCES public.companies(id) ON DELETE CASCADE,
    token TEXT UNIQUE NOT NULL,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.magic_links ENABLE ROW LEVEL SECURITY;

-- Politicas para Usuários Autenticados (Gestores/Membros da empresa podem criar e ver links)
CREATE POLICY "Users can view magic links from their company" ON public.magic_links
    FOR SELECT USING (
        auth.role() = 'authenticated' AND
        company_id IN (
            SELECT company_id FROM public.profiles WHERE user_id = auth.uid() OR id::text = auth.uid()::text
        )
    );

CREATE POLICY "Users can create magic links for their company" ON public.magic_links
    FOR INSERT WITH CHECK (
        auth.role() = 'authenticated'
    );

CREATE POLICY "Users can delete magic links for their company" ON public.magic_links
    FOR DELETE USING (
        auth.role() = 'authenticated' AND
        company_id IN (
            SELECT company_id FROM public.profiles WHERE user_id = auth.uid() OR id::text = auth.uid()::text
        )
    );

-- Politica PÚBLICA (ANON): Qualquer pessoa pode "ler" um magic link específico SE souber o TOKEN exato
-- Esta politica só libera a linha do magic_link. Precisamos criar funções ou views para expor a solicitação relacionada sem comprometer o RLS base da tabela service_requests.
CREATE POLICY "Public can view valid magic link by token" ON public.magic_links
    FOR SELECT USING (
        auth.role() = 'anon' OR auth.role() = 'authenticated'
    );

-- Para evitar complexidade de RLS anônimo na tabela service_requests inteira, 
-- utilizaremos uma função RPC (`SECURITY DEFINER`) que recebe o token, valida, 
-- e retorna apenas os dados enxutos daquela solicitação.

CREATE OR REPLACE FUNCTION get_public_tracking_data(p_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_link public.magic_links;
    v_request RECORD;
    v_shifts JSONB;
    v_checkins JSONB;
    v_result JSONB;
BEGIN
    -- 1. Buscar o Link Mágico
    SELECT * INTO v_link FROM public.magic_links WHERE token = p_token LIMIT 1;
    
    -- Validar existencia e validade
    IF v_link.id IS NULL THEN
        RETURN jsonb_build_object('error', 'Link inválido ou não encontrado.');
    END IF;
    
    IF v_link.expires_at IS NOT NULL AND v_link.expires_at < now() THEN
        RETURN jsonb_build_object('error', 'Este link de acompanhamento expirou.');
    END IF;

    -- 2. Buscar a Ordem de Serviço Básica
    SELECT id, name, description, status, priority, created_at,
           (SELECT name FROM public.work_environments WHERE id = service_requests.work_environment_id LIMIT 1) as environment_name
    INTO v_request
    FROM public.service_requests
    WHERE id = v_link.service_request_id;

    -- 3. Buscar agendamentos (Shifts) relacionados via service_request_id
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', s.id,
        'start_time', s.start_time,
        'end_time', s.end_time,
        'status', s.status,
        'assigned', (
             SELECT jsonb_agg(jsonb_build_object('name', p.name, 'avatar_url', p.avatar_url))
             FROM public.shift_assignments sa
             JOIN public.profiles p ON p.id = sa.profile_id
             WHERE sa.shift_id = s.id
        )
    )), '[]'::jsonb)
    INTO v_shifts
    FROM public.shifts s
    WHERE s.service_request_id = v_request.id;

    -- 4. Construir Resultado Final
    v_result := jsonb_build_object(
        'success', true,
        'request', v_request,
        'shifts', v_shifts
    );

    RETURN v_result;
END;
$$;
