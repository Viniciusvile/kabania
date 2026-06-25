import { createClient } from '@supabase/supabase-js';

let supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Em produção (domínio remoto na Vercel), roteamos a chamada pelo proxy local (/supabase-api)
// para blindar contra bloqueadores de rastreamento (AdBlockers/Brave Shields) e CORS.
if (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
  supabaseUrl = `${window.location.origin}/supabase-api`;
} else if (supabaseUrl && supabaseUrl.startsWith('/')) {
  supabaseUrl = typeof window !== 'undefined' ? `${window.location.origin}${supabaseUrl}` : supabaseUrl;
}

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("ERRO CRÍTICO: Variáveis do Supabase não encontradas no ambiente. Verifique o Configurações > Environment Variables no Vercel.");
}

export const supabase = (supabaseUrl && supabaseAnonKey) 
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        storageKey: 'kabania_supabase_auth_token_v3',
        flowType: 'pkce'
      }
    })
  : null;

if (typeof window !== 'undefined' && supabase) {
  window.supabase = supabase;
}
