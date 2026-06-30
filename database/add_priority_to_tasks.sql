-- Adiciona coluna de prioridade à tabela tasks
-- Valores: baixa | media | alta | urgente
-- Default: media (não quebra registros existentes)

ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS priority TEXT
    NOT NULL
    DEFAULT 'media'
    CHECK (priority IN ('baixa', 'media', 'alta', 'urgente'));

-- Índice para filtros futuros por prioridade
CREATE INDEX IF NOT EXISTS idx_tasks_priority
  ON tasks (priority)
  WHERE priority IN ('alta', 'urgente');

COMMENT ON COLUMN tasks.priority IS 'Prioridade do chamado: baixa | media | alta | urgente';
