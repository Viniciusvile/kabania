-- 🚀 Otimização de Performance para Escalas (Shifts)
-- Melhora a velocidade de buscas por data e empresa, essencial para o Drag-and-Drop instantâneo.

-- 1. Índice composto para buscas de calendário (mais comum)
CREATE INDEX IF NOT EXISTS idx_shifts_company_dates 
ON public.shifts (company_id, start_time, end_time);

-- 2. Índice para buscas por ambiente
CREATE INDEX IF NOT EXISTS idx_shifts_environment 
ON public.shifts (environment_id);

-- 3. Índice para buscas por atividade
CREATE INDEX IF NOT EXISTS idx_shifts_activity 
ON public.shifts (activity_id);

-- 4. Índice para as atribuições (joins rápidos)
CREATE INDEX IF NOT EXISTS idx_shift_assignments_shift_id 
ON public.shift_assignments (shift_id);

CREATE INDEX IF NOT EXISTS idx_shift_assignments_employee 
ON public.shift_assignments (employee_id);

CREATE INDEX IF NOT EXISTS idx_shift_assignments_collaborator 
ON public.shift_assignments (collaborator_id);

-- Analisar as tabelas para atualizar estatísticas do planejador de consultas
ANALYZE public.shifts;
ANALYZE public.shift_assignments;
