import React, { useEffect } from 'react';

// Componente simples para lidar com callbacks OAuth
export default function AuthCallbackHandler() {
  useEffect(() => {
    const handleCallback = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const provider = window.location.pathname.split('/')[2]; // google ou outlook
      const code = urlParams.get('code');
      const error = urlParams.get('error');
      const state = urlParams.get('state');

      if (error) {
        console.error(`Erro de autenticação ${provider}:`, error);
        window.opener?.postMessage({ 
          type: 'oauth_error', 
          provider, 
          error 
        }, window.location.origin);
        window.close();
        return;
      }

      if (code) {
        // Envia o código de autorização de volta para a janela principal
        window.opener?.postMessage({ 
          type: 'oauth_code', 
          provider, 
          code, 
          state 
        }, window.location.origin);
        
        // Fecha a janela após um brief delay
        setTimeout(() => window.close(), 1000);
      } else {
        // Se não há código, fecha após 3 segundos
        setTimeout(() => window.close(), 3000);
      }
    };

    handleCallback();
  }, []);

  return (
    <div style={{ 
      padding: '2rem', 
      textAlign: 'center',
      fontFamily: 'sans-serif' 
    }}>
      <h2>Processando autenticação...</h2>
      <p>Você pode fechar esta janela.</p>
    </div>
  );
}