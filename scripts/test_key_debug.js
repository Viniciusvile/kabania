import fs from 'fs';

function loadEnv() {
  const envContent = fs.readFileSync('./.env', 'utf8');
  const env = {};
  envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) env[key.trim()] = value.trim();
  });
  return env;
}

const env = loadEnv();
const key = env.VITE_GEMINI_API_KEY;

if (key) {
  console.log(`Key length: ${key.length}`);
  console.log(`Starts with: ${key.substring(0, 7)}`);
  console.log(`Ends with: ${key.substring(key.length - 4)}`);
} else {
  console.log("Key not found in .env");
}
