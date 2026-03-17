-- SCRIPT PARA CRIAÇÃO DA TABELA DE COLABORADORES (V2 - FIX TYPE MISMATCH)
-- Execute no SQL Editor do Supabase (https://app.supabase.com/project/_/sql)

-- Remove a tabela antiga para garantir a recriação com os tipos corretos
DROP TABLE IF EXISTS collaborators;

CREATE TABLE collaborators (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id TEXT REFERENCES companies(id) ON DELETE CASCADE, -- Alterado para TEXT para bater com companies.id
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  specialty TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE collaborators ENABLE ROW LEVEL SECURITY;

-- Políticas de Segurança
DROP POLICY IF EXISTS "Usuários podem ver colaboradores da própria empresa" ON collaborators;
CREATE POLICY "Usuários podem ver colaboradores da própria empresa" ON collaborators
FOR SELECT USING (
  company_id IN (SELECT company_id FROM profiles WHERE email = auth.jwt()->>'email')
);

DROP POLICY IF EXISTS "Usuários podem gerenciar colaboradores da própria empresa" ON collaborators;
CREATE POLICY "Usuários podem gerenciar colaboradores da própria empresa" ON collaborators
FOR ALL USING (
  company_id IN (SELECT company_id FROM profiles WHERE email = auth.jwt()->>'email' AND role = 'admin')
);

-- Index para performance
CREATE INDEX IF NOT EXISTS idx_collaborators_company_id ON collaborators(company_id);
