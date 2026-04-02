import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envContent = fs.readFileSync('.env', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
    const [key, ...rest] = line.split('=');
    if (key && rest.length > 0) {
        env[key.trim()] = rest.join('=').trim();
    }
});

const supabaseUrl = env['VITE_SUPABASE_URL'];
const supabaseKey = env['VITE_SUPABASE_ANON_KEY'];

const supabase = createClient(supabaseUrl, supabaseKey);

async function discoverColumns(tableName) {
  console.log(`\n🔍 DISCOVERING COLUMNS FOR: ${tableName}`);
  
  // Try to select ONE record and see the keys
  const { data, error } = await supabase.from(tableName).select().limit(1);

  if (error) {
    console.log(`❌ Error: ${error.message}`);
    // Extract column names from error if it says "Did you mean ...?"
    return;
  }

  if (data && data.length > 0) {
    console.log(`✅ Columns in ${tableName}:`, Object.keys(data[0]).join(', '));
  } else {
    console.log(`ℹ️ No rows found in ${tableName}.`);
  }
}

async function main() {
  await discoverColumns('profiles');
  await discoverColumns('shifts');
  await discoverColumns('projects');
  await discoverColumns('collaborators');
}

main();
