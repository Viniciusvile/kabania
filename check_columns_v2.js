import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// Simple .env parser
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

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTable(tableName) {
  console.log(`\n--- Checking table: ${tableName} ---`);
  
  const { data, error } = await supabase
    .from(tableName)
    .select('*')
    .limit(1);

  if (error) {
    console.error(`❌ Error selecting * from ${tableName}: ${error.code} - ${error.message}`);
    
    // If selecting * failed with "column not found", try to guess PK
    const { error: idError } = await supabase.from(tableName).select('id').limit(1);
    if (idError) {
      console.log(`⚠️ Column "id" ALSO DOES NOT EXIST in ${tableName}. Error: ${idError.message}`);
    } else {
      console.log(`✅ But column "id" EXISTS in ${tableName}. (Select * failed for other reasons, maybe RLS)`);
    }
    return;
  }

  if (data && data.length > 0) {
    console.log(`✅ Columns found in ${tableName}:`, Object.keys(data[0]).join(', '));
  } else {
    console.log(`ℹ️ No rows in ${tableName}, checking for "id" column specifically...`);
    const { error: idError } = await supabase.from(tableName).select('id').limit(1);
    if (idError) {
      console.log(`❌ Column "id" DOES NOT EXIST in ${tableName}.`);
    } else {
      console.log(`✅ Column "id" EXISTS in ${tableName}.`);
    }
  }
}

async function main() {
  await checkTable('projects');
  await checkTable('shifts');
  await checkTable('collaborators');
  await checkTable('profiles');
  await checkTable('work_environments');
  await checkTable('work_activities');
  await checkTable('service_requests');
}

main();
