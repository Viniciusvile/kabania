import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function checkTable(tableName) {
  console.log(`\n--- Checking table: ${tableName} ---`);
  // Using a trick: query with an impossible condition but valid syntax
  // To get the column names from a 0-row result
  const { data, error } = await supabase
    .from(tableName)
    .select('*')
    .limit(1);

  if (error) {
    console.error(`Error selecting * from ${tableName}:`, error);
    return;
  }

  if (data && data.length > 0) {
    console.log(`Columns found in ${tableName}:`, Object.keys(data[0]).join(', '));
  } else {
    // If no data, we might need another way or just trust the error if it was "column not found"
    console.log(`No rows in ${tableName}, columns cannot be determined via select *`);
    
    // Attempting to select a common column to see if it exists
    const { error: idError } = await supabase.from(tableName).select('id').limit(1);
    if (idError) {
      console.log(`Column "id" DOES NOT EXIST in ${tableName}. Error: ${idError.message}`);
    } else {
      console.log(`Column "id" EXISTS in ${tableName}.`);
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
}

main();
