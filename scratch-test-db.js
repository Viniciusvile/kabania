import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://vmolphvjszbwlmfvcttq.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZtb2xwaHZqc3pid2xtZnZjdHRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM0MjM4MDcsImV4cCI6MjA4ODk5OTgwN30.CuLfKKp6bEb9PZmWNceP0qDZ7i53etQqJIh5BNb0Fgw'
);

async function check() {
  console.log('Fetching a valid company...');
  const { data: cData, error: cErr } = await supabase.from('companies').select('id').limit(1);
  if (!cData || cData.length === 0) {
    console.log('No companies found.', cErr);
    return;
  }
  const companyId = cData[0].id;
  console.log('Using company_id:', companyId);

  console.log('Attempting upsert...');
  const mapped = [{
    id: 'test-room-1', company_id: companyId,
    name: 'Test', x: 0, y: 0, w: 10, h: 10, is_occupied: false
  }];
  
  const res = await supabase.from('digital_twin_rooms').upsert(mapped);
  console.log('Upsert result:', res);
}
check();
