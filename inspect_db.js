import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function inspectTable() {
  const { data, error } = await supabase
    .from('activities')
    .select('*')
    .limit(1);
    
  if (error) {
    console.error('Error selecting from activities:', error);
  } else {
    console.log('Sample data / Columns:', data);
  }
}

inspectTable();
