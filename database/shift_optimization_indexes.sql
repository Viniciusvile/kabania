-- Índices de otimização para a área de Gerenciar Escalas
-- Acelera consultas filtradas por empresa, datas e status

CREATE INDEX IF NOT EXISTS idx_shifts_company_id ON public.shifts (company_id);
CREATE INDEX IF NOT EXISTS idx_shifts_start_time ON public.shifts (start_time);
CREATE INDEX IF NOT EXISTS idx_shifts_end_time ON public.shifts (end_time);
CREATE INDEX IF NOT EXISTS idx_shifts_status ON public.shifts (status);
-- Índice composto para buscas comuns por empresa e intervalo de tempo
CREATE INDEX IF NOT EXISTS idx_shifts_company_start ON public.shifts (company_id, start_time);

-- tabelas auxiliares de atribuição de escala
CREATE INDEX IF NOT EXISTS idx_shift_assignments_shift_id ON public.shift_assignments (shift_id);
CREATE INDEX IF NOT EXISTS idx_shift_assignments_employee_id ON public.shift_assignments (employee_id);
CREATE INDEX IF NOT EXISTS idx_shift_assignments_collaborator_id ON public.shift_assignments (collaborator_id);
