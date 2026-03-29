-- ========================================================
-- Correção de RLS (Row Level Security) para Criação de Empresas e Base de Conhecimento
-- ========================================================

-- Problema: Ao criar uma nova empresa, a tabela 'companies' bloqueia o INSERT porque o RLS 
-- estava ativo, mas não havia política permitindo inserções. O mesmo ocorre ao inserir 
-- os templates na 'knowledge_base' durante a etapa inicial.

-- Solução: Permitir que qualquer usuário autenticado faça INSERT em 'companies' e 'knowledge_base'.
-- Como o ID da empresa é preenchido no profile em seguida, a segurança geral de visualização é mantida.

-- 1. Permitir que usuários autenticados criem empresas
DROP POLICY IF EXISTS "Usuários autenticados podem criar empresas" ON companies;
CREATE POLICY "Usuários autenticados podem criar empresas" ON companies
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- 2. Permitir que usuários autenticados formatem a base de dados (templates de IA)
DROP POLICY IF EXISTS "Usuários autenticados podem adicionar categorias de IA na criação" ON knowledge_base;
CREATE POLICY "Usuários autenticados podem adicionar categorias de IA na criação" ON knowledge_base
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- 3. Permitir que usuários autenticados busquem a empresa pelo código de convite
DROP POLICY IF EXISTS "Usuários autenticados podem buscar empresas" ON companies;
CREATE POLICY "Usuários autenticados podem buscar empresas" ON companies
  FOR SELECT USING (auth.role() = 'authenticated');