import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function check() {
  const { data, error } = await supabase.from('customers').select('*').limit(1);
  if (error) {
    console.error("Error:", error);
  } else {
    console.log("Customer columns:", data.length > 0 ? Object.keys(data[0]) : "No customers found, checking definition...");
    // Let's also try to insert a fake record to see if there is a 'revenue' column
  }
}
check();
