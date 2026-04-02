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

async function checkColumnsRaw(tableName) {
  console.log(`\n🔍 CHECKING COLUMNS FOR: ${tableName}`);
  // Attempt to select only "company_id" which we know exists from SQL scipts
  const { data, error } = await supabase
    .from(tableName)
    .select('company_id')
    .limit(1);

  if (error) {
    console.error(`❌ Error selecting company_id from ${tableName}: ${error.code} - ${error.message}`);
    return;
  }

  // If this works, it means the table exists and company_id is valid.
  // Now, HOW to get all column names if select * fails?
  // We can try to select a nonsense column name and see the error message, 
  // sometimes PG list the valid columns in hint or error.
  const { error: nonSenseError } = await supabase.from(tableName).select('non_existent_column').limit(1);
  console.log(`\n❓ Hint from non_existent_column error: ${nonSenseError?.message}`);
}

async function main() {
  await checkColumnsRaw('projects');
  await checkColumnsRaw('shifts');
}

main();
