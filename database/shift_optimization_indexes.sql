-- 🚀 Otimização de Performance para Escalas (Shifts) - VERSÃO FINAL OTIMIZADA
-- Melhora a velocidade de buscas por data, empresa e usuários.

-- 1. Índices da tabela Shifts (Escalas)
CREATE INDEX IF NOT EXISTS idx_shifts_company_dates 
ON public.shifts (company_id, start_time, end_time);

CREATE INDEX IF NOT EXISTS idx_shifts_environment 
ON public.shifts (environment_id);

CREATE INDEX IF NOT EXISTS idx_shifts_activity 
ON public.shifts (activity_id);

-- 2. Índices da tabela Shift Assignments (Atribuições)
CREATE INDEX IF NOT EXISTS idx_shift_assignments_shift_id 
ON public.shift_assignments (shift_id);

CREATE INDEX IF NOT EXISTS idx_shift_assignments_employee 
ON public.shift_assignments (employee_id);

CREATE INDEX IF NOT EXISTS idx_shift_assignments_collaborator 
ON public.shift_assignments (collaborator_id);

-- 3. Índices Críticos na tabela Profiles (Autenticação e RLS rápida)
-- Essencial para evitar Timeouts durante o Drag & Drop
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_company_id ON public.profiles(company_id);

-- 4. Analisar as tabelas para atualizar estatísticas do planejador de consultas
ANALYZE public.shifts;
ANALYZE public.shift_assignments;
ANALYZE public.profiles;
