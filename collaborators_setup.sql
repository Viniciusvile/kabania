-- SCRIPT PARA CRIAÇÃO DA TABELA DE COLABORADORES
-- Execute no SQL Editor do Supabase (https://app.supabase.com/project/_/sql)

CREATE TABLE IF NOT EXISTS collaborators (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
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
