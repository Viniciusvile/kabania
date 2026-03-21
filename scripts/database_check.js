import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Extract from .env manually
const envPath = path.join(__dirname, '..', '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const urlMatch = envContent.match(/VITE_SUPABASE_URL=(.*)/);
const keyMatch = envContent.match(/VITE_SUPABASE_ANON_KEY=(.*)/);

const supabaseUrl = urlMatch ? urlMatch[1].trim() : null;
const supabaseAnonKey = keyMatch ? keyMatch[1].trim() : null;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkSchema() {
  console.log('--- Checking work_environments ---');
  const { data, error } = await supabase
    .from('work_environments')
    .select('*')
    .limit(1);
    
  if (error) {
    console.error('Error selecting:', error);
  } else {
    console.log('Sample Row keys:', data.length > 0 ? Object.keys(data[0]) : 'Table is empty');
    
    // Attempting a select with a definitely missing column to see if PostgREST gives us hints
    const { error: error2 } = await supabase.from('work_environments').select('column_hint_check');
    if (error2) console.log('Hint from Select Error:', error2.message);
  }

  console.log('\n--- Testing Insert ---');
  const testObj = { name: 'Test ' + Date.now(), company_id: 'co-1773888231223' };
  const { data: data3, error: error3 } = await supabase
    .from('work_environments')
    .insert([testObj])
    .select();
    
  if (error3) {
    console.error('Insert Error Detail:', JSON.stringify(error3, null, 2));
  } else {
    console.log('Insert Success:', data3);
  }
}

checkSchema();
