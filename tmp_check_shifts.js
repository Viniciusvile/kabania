
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://vmolphvjszbwlmfvcttq.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZtb2xwaHZqc3pid2xtZnZjdHRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM0MjM4MDcsImV4cCI6MjA4ODk5OTgwN30.CuLfKKp6bEb9PZmWNceP0qDZ7i53etQqJIh5BNb0Fgw';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkShifts() {
  const { data, error } = await supabase
    .from('shifts')
    .select('id, start_time, end_time, service_request_id, company_id, status')
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) {
    console.error('Error fetching shifts:', error);
    process.exit(1);
  }

  console.log('Last 10 shifts in DB:');
  console.table(data);
  process.exit(0);
}

checkShifts();
