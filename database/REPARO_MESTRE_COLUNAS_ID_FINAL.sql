-- ============================================================================
-- 🛠️ REPARO MESTRE: RESTAURAÇÃO DE COLUNAS 'ID' E UNIFICAÇÃO DE SEGURANÇA
-- ============================================================================
-- Execute este script INTEGRALMENTE no SQL Editor do seu Supabase para resolver 
-- os erros de "column id does not exist" e "Erro 400" na criação de escalas.

-- 1. GARANTIR QUE A COLUNA 'ID' EXISTE NAS TABELAS CRÍTICAS
-- Se por algum motivo a coluna foi removida ou renomeada, este bloco a restaura.

DO $$ 
BEGIN 
    -- Tabela: PROFILES
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'id') THEN
        ALTER TABLE public.profiles ADD COLUMN id UUID DEFAULT gen_random_uuid();
        -- Sincronizar com user_id se possível (Cast explicativo para evitar erro ~ uuid)
        UPDATE public.profiles SET id = user_id::uuid WHERE id IS NULL AND user_id::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
    END IF;

    -- Tabela: PROJECTS
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'id') THEN
        ALTER TABLE public.projects ADD COLUMN id TEXT DEFAULT 'p_' || floor(extract(epoch from now()))::text;
    END IF;

    -- Tabela: SHIFTS
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'shifts' AND column_name = 'id') THEN
        ALTER TABLE public.shifts ADD COLUMN id UUID DEFAULT gen_random_uuid();
    END IF;

    -- Tabela: COLLABORATORS
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'collaborators' AND column_name = 'id') THEN
        ALTER TABLE public.collaborators ADD COLUMN id UUID DEFAULT gen_random_uuid();
    END IF;
END $$;

-- 2. RECRIAR FUNÇÃO DE ACESSO MESTRA (TURBO & CACHED)
CREATE OR REPLACE FUNCTION public.check_company_access(target_company_id TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  v_user_company_id TEXT;
BEGIN
  -- 🚀 Otimização: Busca direta ignorando RLS via SECURITY DEFINER
  SELECT company_id::text INTO v_user_company_id 
  FROM public.profiles 
  WHERE user_id::text = auth.uid()::text 
  LIMIT 1;

  RETURN v_user_company_id = target_company_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

-- 3. UNIFICAR POLÍTICAS DE RLS (EVITAR ERRO 400)
-- Removemos políticas antigas e aplicamos a nova lógica de isolamento por company_id.

DO $$ 
DECLARE
  rec record;
BEGIN
  -- Limpar apenas políticas de tabelas afetadas para evitar recursão ou lixo
  FOR rec IN (
    SELECT policyname, tablename 
    FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename IN ('projects', 'shifts', 'shift_assignments', 'profiles', 'collaborators', 'audit_logs', 'work_environments', 'work_activities')
  ) 
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', rec.policyname, rec.tablename);
  END LOOP;
END $$;

-- Aplicar as novas políticas robustas (COM WITH CHECK PARA INSERT)
CREATE POLICY "RLS_Projects" ON public.projects FOR ALL TO authenticated 
    USING (check_company_access(company_id::text))
    WITH CHECK (check_company_access(company_id::text));

CREATE POLICY "RLS_Shifts" ON public.shifts FOR ALL TO authenticated 
    USING (check_company_access(company_id::text))
    WITH CHECK (check_company_access(company_id::text));

CREATE POLICY "RLS_Assignments" ON public.shift_assignments FOR ALL TO authenticated 
    USING (check_company_access((SELECT company_id::text FROM public.shifts WHERE id = shift_assignments.shift_id LIMIT 1)))
    WITH CHECK (check_company_access((SELECT company_id::text FROM public.shifts WHERE id = shift_assignments.shift_id LIMIT 1)));

CREATE POLICY "RLS_Profiles" ON public.profiles FOR ALL TO authenticated 
    USING (user_id::text = auth.uid()::text)
    WITH CHECK (user_id::text = auth.uid()::text);

CREATE POLICY "RLS_Collaborators" ON public.collaborators FOR ALL TO authenticated 
    USING (check_company_access(company_id::text)) 
    WITH CHECK (check_company_access(company_id::text));

-- NOVA: Permitir logs de auditoria sem travar a interface
CREATE POLICY "RLS_AuditLogs_Insert" ON public.audit_logs FOR INSERT TO authenticated 
    WITH CHECK (true); -- Permitir que usuários loguem suas próprias ações

CREATE POLICY "RLS_AuditLogs_Select" ON public.audit_logs FOR SELECT TO authenticated 
    USING (check_company_access(company_id::text));

-- POLÍTICAS ADICIONAIS PARA AMBIENTES E ATIVIDADES
CREATE POLICY "RLS_WorkEnvironments" ON public.work_environments FOR ALL TO authenticated 
    USING (check_company_access(company_id::text))
    WITH CHECK (check_company_access(company_id::text));

CREATE POLICY "RLS_WorkActivities" ON public.work_activities FOR ALL TO authenticated 
    USING (check_company_access(company_id::text))
    WITH CHECK (check_company_access(company_id::text));

-- 5. FUNCTION: move_shift_rpc (COM SUPORTE A MUDANÇA DE ÁREA)
CREATE OR REPLACE FUNCTION public.move_shift_rpc(
    p_shift_id UUID,
    p_start_time TIMESTAMPTZ,
    p_end_time TIMESTAMPTZ,
    p_environment_id TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    v_company_id TEXT;
    v_has_access BOOLEAN;
BEGIN
    -- Buscar company_id do shift
    SELECT company_id::text INTO v_company_id
    FROM public.shifts
    WHERE id = p_shift_id;

    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'Escala não encontrada');
    END IF;

    -- Validar acesso do usuário
    v_has_access := public.check_company_access(v_company_id);

    IF NOT v_has_access THEN
        RETURN json_build_object('success', false, 'error', 'Acesso negado');
    END IF;

    -- Executar o UPDATE (Incluindo environment_id se fornecido)
    -- NOTA: Cast explicitamente para UUID se a coluna for UUID (comum em Supabase)
    UPDATE public.shifts
    SET 
        start_time = p_start_time,
        end_time = p_end_time,
        environment_id = COALESCE(NULLIF(p_environment_id, '')::UUID, environment_id),
        updated_at = now()
    WHERE id = p_shift_id;

    RETURN json_build_object('success', true, 'shift_id', p_shift_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.move_shift_rpc(UUID, TIMESTAMPTZ, TIMESTAMPTZ, TEXT) TO authenticated;

-- 4. ÍNDICES DE PERFORMANCE (TURBO LOAD)
CREATE INDEX IF NOT EXISTS idx_projects_cid ON public.projects(company_id);
CREATE INDEX IF NOT EXISTS idx_shifts_cid ON public.shifts(company_id);
CREATE INDEX IF NOT EXISTS idx_shifts_start_time ON public.shifts(start_time);
CREATE INDEX IF NOT EXISTS idx_profiles_uid ON public.profiles(user_id);

-- Novos Índices para Logs e Ambientes
CREATE INDEX IF NOT EXISTS idx_audit_logs_cid ON public.audit_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON public.audit_logs(user_email);
CREATE INDEX IF NOT EXISTS idx_work_env_cid ON public.work_environments(company_id);

ANALYZE public.projects;
ANALYZE public.shifts;
ANALYZE public.profiles;
ANALYZE public.audit_logs;
ANALYZE public.work_environments;
