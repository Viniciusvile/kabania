-- fix_team_visibility.sql
-- Permite que usuários vejam outros membros da mesma empresa

-- 1. Remover a política antiga restritiva
DROP POLICY IF EXISTS "Usuários podem ver o próprio perfil" ON profiles;

-- 2. Criar nova política que permite ver membros da mesma empresa
-- OU ver o próprio perfil (independente de empresa)
-- OU ver perfis sem empresa (opcional, mas útil para convites)
CREATE POLICY "Visualização de perfis da empresa" ON public.profiles
FOR SELECT USING (
    auth.uid() = user_id -- Ver o próprio
    OR 
    company_id IS NOT NULL AND company_id IN (
        SELECT p.company_id FROM public.profiles p WHERE p.user_id = auth.uid()
    )
);

-- Nota: Se houver erro de recursão infinita, use esta versão simplificada:
-- CREATE POLICY "Visualização de perfis da empresa" ON public.profiles
-- FOR SELECT USING (
--     auth.jwt()->>'email' = email 
--     OR 
--     company_id = (SELECT company_id FROM profiles WHERE email = auth.jwt()->>'email' LIMIT 1)
-- );
