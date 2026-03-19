-- 🛠️ SUPORTE A COLABORADORES EXTERNOS NAS ESCALAS
-- Este script permite que colaboradores de campo sejam escalados em turnos.

-- 1. Adicionar coluna na tabela de atribuições
ALTER TABLE public.shift_assignments 
ADD COLUMN IF NOT EXISTS collaborator_id UUID REFERENCES public.collaborators(id) ON DELETE CASCADE;

-- 2. Remover a restrição de obrigatoriedade do employee_id (internal)
ALTER TABLE public.shift_assignments 
ALTER COLUMN employee_id DROP NOT NULL;

-- 3. Atualizar restrição de unicidade (agora depende de qual ID está presente)
-- Primeiro removemos a antiga
ALTER TABLE public.shift_assignments DROP CONSTRAINT IF EXISTS shift_assignments_shift_id_employee_id_key;

-- Adicionamos uma nova que cobre ambos os casos (uma pessoa só pode estar uma vez no mesmo turno)
CREATE UNIQUE INDEX IF NOT EXISTS idx_shift_assignments_unique_employee 
ON public.shift_assignments (shift_id, employee_id) 
WHERE employee_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_shift_assignments_unique_collaborator 
ON public.shift_assignments (shift_id, collaborator_id) 
WHERE collaborator_id IS NOT NULL;

-- 4. Atualizar Políticas de RLS para incluir colaboradores
DROP POLICY IF EXISTS "Admins can manage shift assignments" ON public.shift_assignments;
CREATE POLICY "Admins can manage shift assignments" ON public.shift_assignments
    FOR ALL TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.shifts s 
            WHERE s.id = shift_assignments.shift_id 
            AND EXISTS (
                SELECT 1 FROM public.profiles p 
                WHERE p.user_id = auth.uid() 
                AND p.company_id = s.company_id 
                AND p.role = 'admin'
            )
        )
    );
