-- kanban_customer_link.sql
-- Adiciona suporte a cliente nas tarefas do Kanban

-- Adiciona a coluna customer_name à tabela tasks se ela não existir
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'customer_name') THEN
        ALTER TABLE tasks ADD COLUMN customer_name TEXT;
    END IF;
END $$;

COMMENT ON COLUMN tasks.customer_name IS 'Nome do cliente associado à tarefa (CRM)';
