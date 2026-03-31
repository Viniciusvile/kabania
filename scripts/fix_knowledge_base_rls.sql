-- ========================================================
-- Correção de RLS para a tabela knowledge_base (permite anon e auth)
-- ========================================================

-- Remove políticas existentes (se houver)
DROP POLICY IF EXISTS "Usuários autenticados podem adicionar categorias de IA na criação" ON knowledge_base;
DROP POLICY IF EXISTS "Users can only see their own company's knowledge" ON knowledge_base;

-- Permite inserts de usuários autenticados ou anônimos (necessário para scripts que usam a chave anon)
CREATE POLICY "knowledge_base_insert_anon_auth" ON public.knowledge_base
  FOR INSERT WITH CHECK (auth.role() IN ('authenticated','anonymous'));

-- Permite leitura apenas de registros pertencentes à empresa do usuário (mantém segurança)
CREATE POLICY "Users podem ler seus próprios registros" ON knowledge_base
  FOR SELECT USING (check_company_access(company_id));
