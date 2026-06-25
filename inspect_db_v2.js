import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function inspect() {
  console.log("Checking 'contracts' table...");
  const { data: contracts, error: cErr } = await supabase.from('contracts').select('*').limit(1);
  if (cErr) console.error("Error fetching contracts:", cErr);
  else console.log("Contracts table exists and is accessible. Found:", contracts);

  console.log("\nChecking 'companies' table...");
  const { data: companies, error: compErr } = await supabase.from('companies').select('id').limit(1);
  if (compErr) console.error("Error fetching companies:", compErr);
  else console.log("Companies table exists. Example ID:", companies[0]?.id);
}

inspect();
