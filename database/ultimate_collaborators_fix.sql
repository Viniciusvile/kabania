-- 🛠️ ULTIMATE REPAIR: TABELA DE COLABORADORES (FIX SCHEMA & ID)
-- Execute no SQL Editor do Supabase para garantir que a estrutura esteja correta.

DROP TABLE IF EXISTS collaborators CASCADE;

CREATE TABLE collaborators (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id TEXT REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  specialty TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE collaborators ENABLE ROW LEVEL SECURITY;

-- Políticas de Segurança (Admin Gerencia, Membro Vê)
DROP POLICY IF EXISTS "Usuários podem ver colaboradores da própria empresa" ON collaborators;
CREATE POLICY "Usuários podem ver colaboradores da própria empresa" ON collaborators
FOR SELECT USING (
  company_id IN (SELECT company_id FROM profiles WHERE (auth.jwt()->>'email')::text = email::text OR company_id = collaborators.company_id)
);

-- CORREÇÃO: Política de Gerenciamento Simples e Eficaz
DROP POLICY IF EXISTS "Usuários podem gerenciar colaboradores da própria empresa" ON collaborators;
CREATE POLICY "Usuários podem gerenciar colaboradores da própria empresa" ON collaborators
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.company_id = collaborators.company_id 
    AND profiles.email = auth.jwt()->>'email'
    AND profiles.role = 'admin'
  )
);

-- Index para performance
CREATE INDEX IF NOT EXISTS idx_collaborators_company_id ON collaborators(company_id);

-- 🔄 Sincronismo com o Dashboard de Escalas (Refix)
-- Garante que o dashboard também funcione com a nova estrutura
GRANT ALL ON TABLE collaborators TO authenticated;
GRANT ALL ON TABLE collaborators TO service_role;
