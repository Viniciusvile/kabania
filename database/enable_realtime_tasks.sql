-- Habilitar o broadcasting em tempo real na tabela tasks
-- Isso é necessário para que a nova assinatura do KanbanBoard.jsx funcione e os cards se movam em tempo real.
alter publication supabase_realtime add table public.tasks;
