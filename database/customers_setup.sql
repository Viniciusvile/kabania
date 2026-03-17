-- customers_setup.sql
-- 1. Criar tabela de clientes
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id TEXT NOT NULL, -- Usando TEXT para compatibilidade com o padrão do sistema (co-...)
    name TEXT NOT NULL,
    address TEXT,
    email TEXT,
    phone TEXT,
    employee_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Habilitar RLS
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

-- 3. Políticas de Acesso
DROP POLICY IF EXISTS "Users can view their own company's customers" ON customers;
CREATE POLICY "Users can view their own company's customers" ON customers
FOR SELECT USING (
    company_id IN (SELECT company_id FROM profiles WHERE email = auth.jwt()->>'email')
);

DROP POLICY IF EXISTS "Users can insert their own company's customers" ON customers;
CREATE POLICY "Users can insert their own company's customers" ON customers
FOR INSERT WITH CHECK (
    company_id IN (SELECT company_id FROM profiles WHERE email = auth.jwt()->>'email')
);

DROP POLICY IF EXISTS "Users can update their own company's customers" ON customers;
CREATE POLICY "Users can update their own company's customers" ON customers
FOR UPDATE USING (
    company_id IN (SELECT company_id FROM profiles WHERE email = auth.jwt()->>'email')
);

DROP POLICY IF EXISTS "Users can delete their own company's customers" ON customers;
CREATE POLICY "Users can delete their own company's customers" ON customers
FOR DELETE USING (
    company_id IN (SELECT company_id FROM profiles WHERE email = auth.jwt()->>'email')
);
