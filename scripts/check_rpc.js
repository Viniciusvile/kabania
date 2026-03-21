import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envPath = path.join(__dirname, '..', '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const urlMatch = envContent.match(/VITE_SUPABASE_URL=(.*)/);
const keyMatch = envContent.match(/VITE_SUPABASE_ANON_KEY=(.*)/);

const supabaseUrl = urlMatch ? urlMatch[1].trim() : null;
const supabaseAnonKey = keyMatch ? keyMatch[1].trim() : null;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkRpc() {
  console.log('Testing RPC exec_sql...');
  // Passing a dummy query
  const { data, error } = await supabase.rpc('exec_sql', { sql: 'SELECT 1' });
  
  if (error) {
    console.log('RPC exec_sql NOT available or error:', error.message);
  } else {
    console.log('RPC exec_sql IS available! Result:', data);
  }
}

checkRpc();
