async function listModels() {
  const apiKey = "INSIRA_SUA_NOVA_CHAVE_AQUI"; // Local placeholder, I need to check the .env
  // Wait, I can't read .env easily here without hardcoding.
  // I'll just try to use fetch with the key from the command line.
  const key = process.argv[2];
  if (!key) {
    console.error("Please provide API key");
    process.exit(1);
  }
  try {
    const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
    const data = await resp.json();
    if (data.models) {
        console.log("AVAILABLE MODELS:");
        data.models.forEach(m => console.log(m.name));
    } else {
        console.log(JSON.stringify(data, null, 2));
    }
  } catch (e) {
    console.error(e);
  }
}

listModels();
