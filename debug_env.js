import fs from 'fs';
import path from 'path';

function loadEnv() {
  const envContent = fs.readFileSync('./.env', 'utf8');
  console.log('Raw content length:', envContent.length);
  const env = {};
  envContent.split(/\r?\n/).forEach(line => {
    console.log('Processing line:', JSON.stringify(line));
    const [key, value] = line.split('=');
    if (key && value) {
      env[key.trim()] = value.trim();
      console.log('  Added:', key.trim());
    }
  });
  return env;
}

try {
  const env = loadEnv();
  console.log('Parsed keys:', Object.keys(env));
  console.log('VITE_SUPABASE_URL:', env.VITE_SUPABASE_URL ? 'FOUND' : 'MISSING');
  console.log('VITE_SUPABASE_ANON_KEY:', env.VITE_SUPABASE_ANON_KEY ? 'FOUND' : 'MISSING');
  console.log('VITE_GEMINI_API_KEY:', env.VITE_GEMINI_API_KEY ? 'FOUND' : 'MISSING');
} catch (e) {
  console.error('Error:', e.message);
}
