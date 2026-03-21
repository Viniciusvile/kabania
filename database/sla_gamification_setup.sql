-- Adicionar os campos de SLA na tabela de requisições de serviço
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='service_requests' AND column_name='sla_deadline') THEN
        ALTER TABLE public.service_requests ADD COLUMN sla_deadline TIMESTAMPTZ;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='service_requests' AND column_name='sla_breached') THEN
        ALTER TABLE public.service_requests ADD COLUMN sla_breached BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- Adicionar os campos de Gamificação na tabela de perfis
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='loyalty_points') THEN
        ALTER TABLE public.profiles ADD COLUMN loyalty_points INT DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='monthly_missions_completed') THEN
        ALTER TABLE public.profiles ADD COLUMN monthly_missions_completed INT DEFAULT 0;
    END IF;
END $$;

-- Trigger para definir o SLA automaticamente na inserção do Chamado (Service Request)
CREATE OR REPLACE FUNCTION set_default_sla()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.sla_deadline IS NULL THEN
        -- Urgente: +4h, Padrão: +24h
        IF LOWER(NEW.priority) = 'urgent' OR LOWER(NEW.priority) = 'urgente' THEN
            NEW.sla_deadline := now() + interval '4 hours';
        ELSE
            NEW.sla_deadline := now() + interval '24 hours';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_default_sla ON public.service_requests;
CREATE TRIGGER trigger_set_default_sla
    BEFORE INSERT ON public.service_requests
    FOR EACH ROW
    EXECUTE FUNCTION set_default_sla();

-- Função que incrementa os pontos de um funcionário de campo ao completar uma missão
CREATE OR REPLACE FUNCTION reward_employee_completion(p_profile_id UUID, p_points INT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.profiles 
    SET loyalty_points = COALESCE(loyalty_points, 0) + p_points,
        monthly_missions_completed = COALESCE(monthly_missions_completed, 0) + 1
    WHERE id = p_profile_id;
END;
$$;
