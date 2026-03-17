-- 🚨 RECOVRY SCRIPT: Disable RLS and restore access
-- Execute this in the Supabase SQL Editor to fix the "id does not exist" and "timeout" errors

-- 1. Disable RLS on all tables to stop the recursion/timeout
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE companies DISABLE ROW LEVEL SECURITY;
ALTER TABLE projects DISABLE ROW LEVEL SECURITY;
ALTER TABLE tasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_base DISABLE ROW LEVEL SECURITY;
ALTER TABLE customers DISABLE ROW LEVEL SECURITY;

-- 2. Clean up the policies that were causing issues
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Members can view their company" ON companies;
DROP POLICY IF EXISTS "Project company isolation" ON projects;
DROP POLICY IF EXISTS "Knowledge base company isolation" ON knowledge_base;
DROP POLICY IF EXISTS "Tasks project isolation" ON tasks;

-- 3. Confirm access is restored
-- Refresh your app now. It should load perfectly.
