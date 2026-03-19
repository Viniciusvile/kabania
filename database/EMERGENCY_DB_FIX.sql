-- 🚨 CORREÇÃO DE EMERGÊNCIA: TABELAS DE RECURSOS (AMBIENTES E ATIVIDADES)
-- Execute este script caso receba o erro 'column "id" does not exist'

-- 1. Ativar Extensão de UUID (Fundamental para gerar IDs automáticos)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Corrigir Tabela de Ambientes (work_environments)
DO $$ 
BEGIN 
    -- Adiciona a coluna id se ela não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='work_environments' AND column_name='id') THEN
        ALTER TABLE public.work_environments ADD COLUMN id UUID DEFAULT uuid_generate_v4();
    END IF;

    -- Garante que a coluna 'id' seja a Chave Primária (PK)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name='work_environments' AND constraint_type='PRIMARY KEY'
    ) THEN
        ALTER TABLE public.work_environments ADD PRIMARY KEY (id);
    END IF;
END $$;

-- 3. Corrigir Tabela de Atividades (work_activities)
DO $$ 
BEGIN 
    -- Adiciona a coluna id se ela não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='work_activities' AND column_name='id') THEN
        ALTER TABLE public.work_activities ADD COLUMN id UUID DEFAULT uuid_generate_v4();
    END IF;

    -- Garante que a coluna 'id' seja a Chave Primária (PK)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name='work_activities' AND constraint_type='PRIMARY KEY'
    ) THEN
        ALTER TABLE public.work_activities ADD PRIMARY KEY (id);
    END IF;
END $$;

-- 4. Garantir que RLS não bloqueie a inserção inicial (Ajuste para Administradores)
ALTER TABLE public.work_environments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_activities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow any authenticated for now" ON public.work_environments;
CREATE POLICY "Allow any authenticated for now" ON public.work_environments FOR ALL TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow any authenticated for now" ON public.work_activities;
CREATE POLICY "Allow any authenticated for now" ON public.work_activities FOR ALL TO authenticated USING (true);

-- ✅ REPARO CONCLUÍDO. Recarregue a página do sistema.
