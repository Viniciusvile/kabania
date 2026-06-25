// src/services/crmIntegrationService.js
// Service to integrate Click Condomínios CRM with Kabania.

// Use env vars if available, otherwise fall back to production defaults
const API_URL = (import.meta.env.VITE_CRM_API_URL || 'https://click-prestare-production.up.railway.app').trim();
const API_KEY = (import.meta.env.VITE_CRM_API_KEY || 'click_kabania_secret_3a8c9b2d7e1f4a5b').trim();

// Robust mock data fallback if API is not configured or offline
const MOCK_CRM_DATA = {
  condominios: [
    {
      id: 1,
      nome: "Edifício Demo (CRM)",
      identificacao: "12.345.678/0001-90",
      ativo: 1,
      created_at: "2026-05-09T04:33:15.000Z"
    },
    {
      id: 2,
      nome: "Condomínio Primavera (CRM)",
      identificacao: "98.765.432/0001-10",
      ativo: 1,
      created_at: "2026-05-10T10:00:00.000Z"
    }
  ],
  ocorrencias: [
    {
      id: 1,
      descricao: "Vazamento na tubulação da garagem do subsolo",
      status: "Pendente",
      created_at: "2026-06-25T08:00:00.000Z",
      condominio_id: 1,
      condominio_nome: "Edifício Demo (CRM)",
      categoria: "Manutenção"
    },
    {
      id: 2,
      descricao: "Lâmpada de emergência queimada no hall do 4º andar",
      status: "Pendente",
      created_at: "2026-06-25T09:00:00.000Z",
      condominio_id: 1,
      condominio_nome: "Edifício Demo (CRM)",
      categoria: "Iluminação"
    },
    {
      id: 3,
      descricao: "Barulho excessivo e festa após o horário regulamentar",
      status: "Pendente",
      created_at: "2026-06-25T10:30:00.000Z",
      condominio_id: 2,
      condominio_nome: "Condomínio Primavera (CRM)",
      categoria: "Segurança"
    }
  ],
  funcionarios: [
    {
      id: "func-101",
      tipo: "Administrativo/Operacional",
      nome: "Bruno Rufini (CRM)",
      funcao: "Zelador",
      escala: "44h semanais",
      condominio_id: 1,
      condominio_nome: "Edifício Demo (CRM)",
      ativo: 1
    },
    {
      id: "port-102",
      tipo: "Portaria",
      nome: "Marcos Silva (CRM)",
      funcao: "Porteiro",
      escala: "Diurno (12x36)",
      condominio_id: 1,
      condominio_nome: "Edifício Demo (CRM)",
      ativo: 1
    },
    {
      id: "port-103",
      tipo: "Portaria",
      nome: "Ana Lima (CRM)",
      funcao: "Porteira",
      escala: "Noturno (12x36)",
      condominio_id: 2,
      condominio_nome: "Condomínio Primavera (CRM)",
      ativo: 1
    }
  ]
};

export async function fetchCrmSyncData() {
  if (!API_URL || !API_KEY) {
    console.log("[CRM Integration] API não configurada, usando dados de demonstração.");
    return MOCK_CRM_DATA;
  }

  try {
    const response = await fetch(`${API_URL}/api/integrations/kabania/sync-data`, {
      method: 'GET',
      headers: {
        'x-api-key': API_KEY,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`CRM API HTTP Error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log("[CRM Integration] Sincronização de dados concluída com sucesso da API.");
    return data;
  } catch (error) {
    console.warn("[CRM Integration] Falha ao conectar com a API do CRM. Usando dados mockados de fallback:", error.message);
    return MOCK_CRM_DATA;
  }
}
