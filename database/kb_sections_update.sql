-- kb_sections_update.sql
-- Adiciona suporte a categorias (seções) na Base de Conhecimento

-- 1. Adiciona a coluna 'section' se ela não existir
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'knowledge_base' AND column_name = 'section') THEN
        ALTER TABLE knowledge_base ADD COLUMN section TEXT DEFAULT 'general';
    END IF;
END $$;

-- 2. Atualiza itens existentes para seções padrão (opcional)
-- Itens com 'Histórico' na descrição ou título podem ir para 'company_data'
UPDATE knowledge_base SET section = 'company_data' 
WHERE title ILIKE '%histórico%' OR title ILIKE '%políticas%' OR title ILIKE '%empresa%';

-- Itens que parecem problemas podem ir para 'troubleshooting'
UPDATE knowledge_base SET section = 'troubleshooting' 
WHERE title ILIKE '%erro%' OR title ILIKE '%problema%' OR title ILIKE '%suporte%';
