-- =====================================================================================
-- OTIMIZAÇÃO DE PERFORMANCE DO ESTOQUE E SISTEMA (ZERO LAG RLS)
-- =====================================================================================

-- 1. OTIMIZAÇÃO DA FUNÇÃO RLS GLOBAL (CRÍTICO PARA PERFORMANCE)
-- Mudar de VOLATILE (padrão) para STABLE.
-- Isso diz ao Postgres que a função retorna o mesmo resultado para os mesmos parâmetros
-- durante a MESMA QUERY. Assim, o banco faz "Cache" do acesso de segurança,
-- reduzindo o tempo de consulta de O(N) para O(1).
ALTER FUNCTION public.check_company_access(target_company_id TEXT) STABLE;


-- 2. CRIAÇÃO DE ÍNDICES PARA O MÓDULO DE INVENTÁRIO
-- Permite buscas instantâneas sem "Sequential Scan" na tabela inteira.

-- Índices principais de Multi-tenancy
CREATE INDEX IF NOT EXISTS idx_inventory_items_company_id 
    ON public.inventory_items(company_id);

CREATE INDEX IF NOT EXISTS idx_inventory_transactions_company_id 
    ON public.inventory_transactions(company_id);

-- Índices de Foreign Key (Para acelerar joins e buscas específicas)
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_item_id 
    ON public.inventory_transactions(item_id);


-- 3. ANALYZE
-- Atualiza as estatísticas do planejador do banco de dados para usar os novos índices imediatamente.
ANALYZE public.inventory_items;
ANALYZE public.inventory_transactions;
