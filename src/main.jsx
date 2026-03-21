import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { GoogleOAuthProvider } from '@react-oauth/google'
import './index.css'
import App from './App.jsx'

// 🛡️ SUPPRESS SUPABASE LOCK & OAUTH UNMOUNT WARNINGS
window.addEventListener('unhandledrejection', (event) => {
  const isLockError = event.reason?.name === 'AbortError' || 
                     event.reason?.message?.includes('Lock broken') ||
                     event.reason?.message?.includes('steal');
  if (isLockError) {
    event.preventDefault();
    console.warn('[Supabase Lock Recovery] Conflito de armazenamento detectado.');
  }
});

// Suprime erros de unmount do React/Google OAuth (removeChild failed)
window.addEventListener('error', (event) => {
  const isRemoveChildError = event.message?.includes('removeChild') || 
                            event.message?.includes('not a child of this node');
  if (isRemoveChildError) {
    event.preventDefault();
    console.warn('[Kabania Fix] Erro de limpeza de DOM suprimido (Google OAuth unmount).');
  }
});

// Registrar Service Worker para Modo PWA / Offline
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/serviceWorker.js').then(
      (registration) => console.log('ServiceWorker registrado com sucesso: ', registration.scope),
      (err) => console.log('Falha ao registrar ServiceWorker: ', err)
    );
  });
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID || "505677501484-h3n43t426kbo436gi3fq2s57b3npcqg6.apps.googleusercontent.com"}>
      <App />
    </GoogleOAuthProvider>
  </StrictMode>,
)
