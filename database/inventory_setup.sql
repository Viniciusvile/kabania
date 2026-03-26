-- 📦 INVENTORY AND SUPPLIES MODULE SETUP
-- This script creates the core multi-tenant tables for stock management and transactions

-- 1. Table: inventory_items
CREATE TABLE IF NOT EXISTS public.inventory_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id TEXT NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    quantity NUMERIC DEFAULT 0,
    min_threshold NUMERIC DEFAULT 5,
    unit TEXT NOT NULL DEFAULT 'un',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Protect with RLS (Multi-tenancy)
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;

-- Using the master security function check_company_access
CREATE POLICY "Inventory Items Isolation" ON public.inventory_items 
FOR ALL USING (check_company_access(company_id)) 
WITH CHECK (check_company_access(company_id));


-- 2. Table: inventory_transactions
CREATE TABLE IF NOT EXISTS public.inventory_transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    item_id UUID NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
    company_id TEXT NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('in', 'out')),
    quantity NUMERIC NOT NULL,
    user_email TEXT NOT NULL,
    reference_id TEXT, -- optional link to a Service Desk ticket
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Protect with RLS
ALTER TABLE public.inventory_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Inventory Transactions Isolation" ON public.inventory_transactions 
FOR ALL USING (check_company_access(company_id)) 
WITH CHECK (check_company_access(company_id));

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION update_inventory_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS trigger_update_inventory_updated_at ON public.inventory_items;

CREATE TRIGGER trigger_update_inventory_updated_at
BEFORE UPDATE ON public.inventory_items
FOR EACH ROW
EXECUTE FUNCTION update_inventory_updated_at_column();

-- Function to safely update stock when a transaction happens
CREATE OR REPLACE FUNCTION handle_inventory_transaction()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.type = 'in' THEN
    UPDATE public.inventory_items SET quantity = quantity + NEW.quantity WHERE id = NEW.item_id;
  ELSIF NEW.type = 'out' THEN
    UPDATE public.inventory_items SET quantity = quantity - NEW.quantity WHERE id = NEW.item_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_handle_inventory_transaction ON public.inventory_transactions;

CREATE TRIGGER trigger_handle_inventory_transaction
AFTER INSERT ON public.inventory_transactions
FOR EACH ROW
EXECUTE FUNCTION handle_inventory_transaction();
