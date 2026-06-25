const url = 'https://click-prestare-production.up.railway.app';
const api_key = 'click_kabania_secret_3a8c9b2d7e1f4a5b';

const paths = [
  '/integrations/kabania/sync-data',
  '/api/integrations/kabania/sync-data',
  '/api/kabania/sync-data',
  '/kabania/sync-data',
  '/api/integrations/kabania',
  '/api/sync-data'
];

for (const p of paths) {
  try {
    const res = await fetch(`${url}${p}`, {
      headers: {
        'x-api-key': api_key,
        'Accept': 'application/json'
      }
    });
    console.log(`Path: ${p} | Status: ${res.status}`);
    if (res.status === 200) {
      const data = await res.json();
      console.log(`SUCCESS for path ${p}! Found data:`, JSON.stringify(data, null, 2).substring(0, 500));
      break;
    }
  } catch (err) {
    console.log(`Path ${p} failed:`, err.message);
  }
}
