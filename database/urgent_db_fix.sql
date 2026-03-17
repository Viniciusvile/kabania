-- urgent_db_fix.sql
-- Script de correção urgente para colunas ausentes no Supabase

-- 1. Garantir colunas na tabela de 'activities' (Atividades)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'activities' AND column_name = 'google_event_id') THEN
        ALTER TABLE activities ADD COLUMN google_event_id TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'activities' AND column_name = 'address') THEN
        ALTER TABLE activities ADD COLUMN address TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'activities' AND column_name = 'description') THEN
        ALTER TABLE activities ADD COLUMN description TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'activities' AND column_name = 'observation') THEN
        ALTER TABLE activities ADD COLUMN observation TEXT;
    END IF;
END $$;

-- 2. Garantir colunas na tabela de 'tasks' (Kanban)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'customer_name') THEN
        ALTER TABLE tasks ADD COLUMN customer_name TEXT;
    END IF;
END $$;

-- NOTA: Após rodar este script, o Supabase pode levar alguns segundos para atualizar o cache do esquema.
