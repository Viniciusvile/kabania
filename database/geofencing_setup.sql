-- =================================================================================
-- FEAT 1: PONTO ELETRÔNICO GEOREFERENCIADO E QR CODE
-- Run this in your Supabase SQL Editor
-- =================================================================================

-- 1. Adicionar Coordenadas aos Ambientes Existentes
ALTER TABLE public.work_environments 
ADD COLUMN IF NOT EXISTS latitude DECIMAL,
ADD COLUMN IF NOT EXISTS longitude DECIMAL,
ADD COLUMN IF NOT EXISTS geofence_radius_meters INTEGER DEFAULT 100;

-- 2. Tabela de Check-ins de Turno (Auditoria Completa)
CREATE TABLE IF NOT EXISTS public.shift_checkins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shift_id UUID REFERENCES public.shifts(id) ON DELETE CASCADE,
    profile_id UUID, -- Link lógico para public.profiles(user_id)
    company_id TEXT REFERENCES public.companies(id) ON DELETE CASCADE,
    
    checkin_type TEXT NOT NULL CHECK (checkin_type IN ('gps', 'qrcode', 'manual')),
    action_type TEXT NOT NULL CHECK (action_type IN ('check_in', 'check_out')),
    
    latitude DECIMAL,
    longitude DECIMAL,
    distance_meters DECIMAL, -- Distância do work_environment no momento do ponto
    
    qr_data TEXT, -- Conteúdo do QR Code lido, se for o caso
    status TEXT DEFAULT 'pending_approval' CHECK (status IN ('approved', 'rejected_distance', 'pending_approval')),
    
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Ativar RLS
ALTER TABLE public.shift_checkins ENABLE ROW LEVEL SECURITY;

-- 3. Políticas de Segurança (RLS)
-- Policy de Leitura (Membros da empresa veem da empresa)
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'View shift checkins' AND tablename = 'shift_checkins') THEN
        CREATE POLICY "View shift checkins" ON public.shift_checkins FOR SELECT USING (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Insert shift checkins' AND tablename = 'shift_checkins') THEN
        CREATE POLICY "Insert shift checkins" ON public.shift_checkins FOR INSERT WITH CHECK (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()) OR profile_id = auth.uid());
    END IF;
END $$;


-- 4. Função Distância em Metros (Haversine Formula via SQL)
CREATE OR REPLACE FUNCTION calculate_distance(lat1 DECIMAL, lon1 DECIMAL, lat2 DECIMAL, lon2 DECIMAL)
RETURNS DECIMAL AS $$
DECLARE
    -- Radius of the Earth in km
    R DECIMAL = 6371;
    dLat DECIMAL = radians(lat2 - lat1);
    dLon DECIMAL = radians(lon2 - lon1);
    a DECIMAL = sin(dLat / 2) * sin(dLat / 2) +
                cos(radians(lat1)) * cos(radians(lat2)) *
                sin(dLon / 2) * sin(dLon / 2);
    c DECIMAL = 2 * atan2(sqrt(a), sqrt(1 - a));
    distance_km DECIMAL = R * c;
BEGIN
    -- Retorna metros
    RETURN distance_km * 1000;
END
$$ LANGUAGE plpgsql IMMUTABLE;

-- 5. Função RPC para Registrar o Ponto
CREATE OR REPLACE FUNCTION register_shift_checkin(
    p_shift_id UUID,
    p_profile_id UUID,
    p_company_id TEXT,
    p_checkin_type TEXT,
    p_action_type TEXT,
    p_latitude DECIMAL DEFAULT NULL,
    p_longitude DECIMAL DEFAULT NULL,
    p_qr_data TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
    v_env_id UUID;
    v_env_lat DECIMAL;
    v_env_lon DECIMAL;
    v_radius INTEGER;
    v_dist DECIMAL;
    v_status TEXT := 'approved';
    v_result JSONB;
BEGIN

    -- 1. Descobrir onde é o local de trabalho do turno
    SELECT act.environment_id INTO v_env_id
    FROM public.shifts s
    JOIN public.work_activities act ON act.id = s.activity_id
    WHERE s.id = p_shift_id;
    
    -- Se ambiente não encontrado, erro
    IF v_env_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Ambiente não encontrado para o turno.', 'code', 'ENV_NOT_FOUND');
    END IF;

    -- 2. Puxar coordenadas do local
    SELECT latitude, longitude, COALESCE(geofence_radius_meters, 100) 
    INTO v_env_lat, v_env_lon, v_radius
    FROM public.work_environments WHERE id = v_env_id;

    -- 3. Se enviou GPS e o local tem GPS configurado, auditar a distância!
    IF p_latitude IS NOT NULL AND p_longitude IS NOT NULL AND v_env_lat IS NOT NULL THEN
        v_dist := calculate_distance(v_env_lat, v_env_lon, p_latitude, p_longitude);
        IF v_dist > v_radius THEN
            v_status := 'rejected_distance';
        END IF;
    END IF;

    -- Se for o check_out sem GPS, ou QR Code, mantem como approved ou pending (configurável do admin)
    
    -- 4. Inserir o Ponto
    INSERT INTO public.shift_checkins (
        shift_id, profile_id, company_id, checkin_type, action_type, 
        latitude, longitude, distance_meters, qr_data, status
    ) VALUES (
        p_shift_id, p_profile_id, p_company_id, p_checkin_type, p_action_type,
        p_latitude, p_longitude, v_dist, p_qr_data, v_status
    );

    -- 5. Se foi um check-in aprovado, atualiza o Shift para 'active'
    IF v_status = 'approved' AND p_action_type = 'check_in' THEN
        UPDATE public.shifts SET status = 'active' WHERE id = p_shift_id;
    END IF;

    -- Se foi check-out, atualiza para completed e registra a saída
    IF v_status = 'approved' AND p_action_type = 'check_out' THEN
        UPDATE public.shifts SET status = 'completed' WHERE id = p_shift_id;
    END IF;

    RETURN jsonb_build_object(
        'success', true, 
        'status', v_status,
        'distance', v_dist
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
