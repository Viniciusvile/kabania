import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://vmolphvjszbwlmfvcttq.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZtb2xwaHZqc3pid2xtZnZjdHRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM0MjM4MDcsImV4cCI6MjA4ODk5OTgwN30.CuLfKKp6bEb9PZmWNceP0qDZ7i53etQqJIh5BNb0Fgw';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
