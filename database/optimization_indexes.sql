-- Script de Otimização de Banco de Dados: Kabania
-- Objetivo: Adicionar índices para acelerar consultas filtradas por empresa e usuário.

-- 1. Tabela de Perfis
CREATE INDEX IF NOT EXISTS idx_profiles_company_id ON profiles(company_id);
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

-- 2. Tabela de Projetos
CREATE INDEX IF NOT EXISTS idx_projects_company_id ON projects(company_id);

-- 3. Tabela de Tarefas (Kanban)
CREATE INDEX IF NOT EXISTS idx_tasks_company_id ON tasks(company_id);
CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_column_id ON tasks(column_id);

-- 4. Tabela de Atividades (Solicitações)
CREATE INDEX IF NOT EXISTS idx_activities_company_id ON activities(company_id);
CREATE INDEX IF NOT EXISTS idx_activities_created_by ON activities(created_by);
CREATE INDEX IF NOT EXISTS idx_activities_status ON activities(status);

-- 5. Tabela de Histórico
CREATE INDEX IF NOT EXISTS idx_history_company_id ON history(company_id);
CREATE INDEX IF NOT EXISTS idx_history_created_at ON history(created_at);

-- INFO: Após rodar este script, as buscas que o sistema faz ao carregar 
-- serão executadas instantaneamente pelo banco de dados, sem precisar ler 
-- todas as linhas das tabelas (Full Table Scan).
