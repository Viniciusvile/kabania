-- ============================================================================
-- 🚀 ESCALAS INTELLIGENT (V4) - Intelligence & Skills Metadata
-- ============================================================================

-- 1. ADICIONAR METADADOS DE INTELIGÊNCIA ÀS ESCALAS (SHIFTS)
ALTER TABLE public.shifts 
ADD COLUMN IF NOT EXISTS intelligence_metadata JSONB DEFAULT '{}'::jsonb;

-- 2. ADICIONAR REQUISITOS DE HABILIDADE ÀS ATIVIDADES (WORK_ACTIVITIES)
ALTER TABLE public.work_activities 
ADD COLUMN IF NOT EXISTS required_skills TEXT[] DEFAULT '{}'::text[];

-- 3. ADICIONAR PERFIL DE HABILIDADES AOS COLABORADORES (EMPLOYEE_PROFILES)
ALTER TABLE public.employee_profiles 
ADD COLUMN IF NOT EXISTS skills TEXT[] DEFAULT '{}'::text[],
ADD COLUMN IF NOT EXISTS performance_notes TEXT;

-- 4. ATUALIZAR A VIEW DE ALTA PERFORMANCE PARA INCLUIR OS NOVOS CAMPOS
CREATE OR REPLACE VIEW view_shifts_standard AS
SELECT 
    s.*,
    we.name as environment_name,
    wa.name as activity_name,
    wa.required_role,
    wa.required_skills,
    (SELECT count(*) FROM public.shift_assignments sa WHERE sa.shift_id = s.id) as assigned_count,
    (SELECT count(*) FROM public.shift_calls sc WHERE sc.shift_id = s.id) as calls_count,
    (SELECT count(*) FROM public.shift_calls sc WHERE sc.shift_id = s.id AND sc.status = 'open') as open_calls_count
FROM public.shifts s
LEFT JOIN public.work_environments we ON s.environment_id = we.id
LEFT JOIN public.work_activities wa ON s.activity_id = wa.id;

-- 5. RE-APLICAR PERMISSÕES
GRANT SELECT ON view_shifts_standard TO authenticated;

-- NOTA: Execute este script no SQL Editor do Supabase se estiver rodando localmente.
