import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envContent = fs.readFileSync('./.env', 'utf8');
const env = {};
envContent.split(/\r?\n/).forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) env[key.trim()] = value.trim();
});

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

async function testConnection() {
    console.log('Testing connection to:', env.VITE_SUPABASE_URL);
    const { data, error } = await supabase.from('profiles').select('count', { count: 'exact', head: true });
    if (error) {
        console.error('Connection error:', error.message);
    } else {
        console.log('Connection successful! Profiles count:', data);
    }
}

testConnection();
