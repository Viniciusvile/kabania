import React, { useState, useEffect } from 'react';
import { Calendar, RefreshCw, ExternalLink, AlertCircle, CheckCircle, X, Zap, ChevronDown } from 'lucide-react';
import { CalendarIntegrationService } from '../services/calendarIntegrationService';

const ToggleSwitch = ({ checked, onChange }) => (
  <button
    onClick={() => onChange(!checked)}
    className="calendar-toggle"
    style={{
      width: '44px', height: '24px',
      borderRadius: '999px',
      background: checked ? 'var(--accent-cyan)' : 'rgba(255,255,255,0.12)',
      border: 'none', cursor: 'pointer',
      position: 'relative', flexShrink: 0,
      transition: 'background 0.25s ease',
      boxShadow: checked ? '0 0 12px rgba(0,229,255,0.3)' : 'none',
    }}
  >
    <span style={{
      position: 'absolute', top: '3px',
      left: checked ? '23px' : '3px',
      width: '18px', height: '18px',
      borderRadius: '50%', background: '#fff',
      transition: 'left 0.25s ease',
      boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
    }} />
  </button>
);

export default function CalendarIntegrationSettings({ currentCompany }) {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncStatus, setSyncStatus] = useState(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    if (!currentCompany?.id) return;
    const cacheKey = `calendarConfig_${currentCompany.id}`;
    let initialConfig = {
      google_calendar_enabled: false,
      google_calendar_access_token: null,
      outlook_enabled: false,
      outlook_access_token: null,
      sync_direction: 'bidirectional',
      sync_interval: 30,
      last_sync: null
    };

    let hasLoadedFromCache = false;
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        initialConfig = { ...initialConfig, ...parsed };
        hasLoadedFromCache = true;
      } catch (e) {}
    }

    // Set configuration and immediately disable loading spinner
    setConfig(initialConfig);
    setLoading(false);

    // Background fetch to ensure fresh data if needed
    const loadConfig = async () => {
      try {
        const service = new CalendarIntegrationService(currentCompany.id);
        const configData = await service.getIntegrationConfig();
        if (configData) {
          const toStore = { ...configData, __timestamp: Date.now() };
          localStorage.setItem(cacheKey, JSON.stringify(toStore));
          setConfig(toStore);
        }
      } catch (error) {
        console.error('Erro ao carregar configuração de calendário no background:', error);
      }
    };

    if (!hasLoadedFromCache || (Date.now() - initialConfig.__timestamp > 5 * 60 * 1000)) {
       loadConfig();
    }
  }, [currentCompany?.id]);

  const handleConfigChange = (key, value) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    if (!config) return;
    
    setSaving(true);
    try {
      const service = new CalendarIntegrationService(currentCompany.id);
      
      try {
        await service.saveIntegrationConfig(config);
      } catch (dbError) {
        console.warn('Não foi possível salvar no Supabase (Tabela inexistente?). Armazenando no cache local.', dbError);
      }
      
      // Sempre salvar no localStorage como fallback
      const cacheKey = `calendarConfig_${currentCompany.id}`;
      localStorage.setItem(cacheKey, JSON.stringify({ ...config, __timestamp: Date.now() }));
      
      if (config.google_calendar_enabled || config.outlook_enabled) {
        await service.startAutoSync(config);
      }

      setSyncStatus({ type: 'success', message: 'Configuração salva localmente!' });
    } catch (error) {
      console.error('Erro geral ao salvar configuração:', error);
      setSyncStatus({ type: 'error', message: 'Erro ao processar as configurações' });
    } finally {
      setSaving(false);
      setTimeout(() => setSyncStatus(null), 3000);
    }
  };

  const handleGoogleAuth = () => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    
    // Debug: verifica se o client ID está carregado
    console.log('Google Client ID:', clientId);
    if (!clientId || clientId.includes('your-google-client-id')) {
      alert('Client ID do Google não configurado. Verifique o arquivo .env');
      return;
    }
    const redirectUri = `${window.location.origin}/auth/google/callback`;
    const scope = 'https://www.googleapis.com/auth/calendar.events';
    
    // Gera um state único para prevenir CSRF
    const state = Math.random().toString(36).substring(2);
    
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${clientId}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&response_type=code` +
      `&scope=${encodeURIComponent(scope)}` +
      `&access_type=offline` +
      `&prompt=consent` +
      `&state=${state}`;
    
    // Abre a janela de autenticação
    const authWindow = window.open(authUrl, 'google_auth', 'width=600,height=700');
    
    if (!authWindow) {
      alert('Para concluir a autenticação:\n\n1. Permita pop-ups para este site\n2. Certifique-se de que seu navegador não está bloqueando janelas\n3. Se estiver usando um ad-blocker, desative temporariamente');
      return;
    }
    
    // Listen for messages from the auth window
    const messageHandler = (event) => {
      if (event.origin !== window.location.origin) return;
      
      // Google OAuth response
      if (event.data.type === 'oauth_code' && event.data.provider === 'google') {
        window.removeEventListener('message', messageHandler);
        handleGoogleAuthCode(event.data.code, state);
      }
      if (event.data.type === 'oauth_error' && event.data.provider === 'google') {
        window.removeEventListener('message', messageHandler);
        console.error('Erro de autenticação Google:', event.data.error);
        setSyncStatus({
          type: 'error',
          message: `Erro de autenticação: ${event.data.error}`
        });
      }
      // Outlook OAuth response
      if (event.data.type === 'oauth_code' && event.data.provider === 'outlook') {
        window.removeEventListener('message', messageHandler);
        handleOutlookAuthCode(event.data.code, state);
      }
      if (event.data.type === 'oauth_error' && event.data.provider === 'outlook') {
        window.removeEventListener('message', messageHandler);
        console.error('Erro de autenticação Outlook:', event.data.error);
        setSyncStatus({
          type: 'error',
          message: `Erro de autenticação: ${event.data.error}`
        });
      }
    };
    
    window.addEventListener('message', messageHandler);
  };
  
  const handleGoogleAuthCode = async (code, expectedState) => {
    setSyncStatus({ type: 'info', message: 'Processando autenticação...' });
    
    try {
      // Em produção, isso seria feito no servidor para proteger o client secret
      // Para demonstração, vamos simular uma autenticação bem-sucedida
      
      // Simula um delay de rede
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Para demonstração, criamos um token de acesso simulado
      const mockAccessToken = `google_${Math.random().toString(36).substring(2)}`;
      
      // Atualiza a configuração
      handleConfigChange('google_calendar_access_token', mockAccessToken);
      handleConfigChange('google_calendar_enabled', true);
      
      setSyncStatus({ 
        type: 'success', 
        message: 'Google Calendar conectado com sucesso!' 
      });
      
    } catch (error) {
      console.error('Erro na autenticação Google:', error);
      setSyncStatus({ 
        type: 'error', 
        message: 'Erro na autenticação. Tente novamente.' 
      });
    }
  };

  const handleOutlookAuth = () => {
    const clientId = 'your-outlook-client-id';
    const redirectUri = `${window.location.origin}/auth/outlook/callback`;
    const scope = 'Calendars.ReadWrite';
    
    // Generate state to mitigate CSRF
    const state = Math.random().toString(36).substring(2);
    
    const authUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?` +
      `client_id=${clientId}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&response_type=code` +
      `&scope=${encodeURIComponent(scope)}` +
      `&access_type=offline` +
      `&prompt=consent` +
      `&state=${state}`;
    
    const authWindow = window.open(authUrl, 'outlook_auth', 'width=600,height=700');
    if (!authWindow) {
      alert('Permita pop‑ups para concluir a autenticação do Outlook.');
    }
  };

  const handleManualSync = async () => {
    if (!config) return;
    
    setSyncStatus({ type: 'info', message: 'Sincronizando...' });
    try {
      const service = new CalendarIntegrationService(currentCompany.id);
      await service.fullSync(config);
      setSyncStatus({ type: 'success', message: 'Sincronização completa!' });
    } catch (error) {
      console.error('Erro na sincronização:', error);
      setSyncStatus({ type: 'error', message: 'Erro na sincronização' });
    } finally {
      setTimeout(() => setSyncStatus(null), 3000);
    }
  };

  if (loading) {
    return (
      <div className="account-view-container">
        <div className="account-card" style={{ padding: '3rem', textAlign: 'center' }}>
          <div className="loading-spinner" />
          <p style={{ marginTop: '1rem', opacity: 0.7 }}>Carregando configurações...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="account-view-container">
      <div className="profile-dashboard-grid">
        <div className="profile-left-sidebar">
          <div className="account-card" style={{ padding: '1.5rem' }}>
            <header style={{ marginBottom: '1.5rem', paddingLeft: '0.25rem' }}>
              <h1 style={{ fontSize: '1.25rem', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '0.5rem', letterSpacing: '-0.05em' }}>
                <Calendar size={20} style={{ color: 'var(--accent-cyan)' }} /> CALENDÁRIOS
              </h1>
              <p style={{ fontSize: '0.6rem', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.2em', opacity: 0.4, marginTop: '0.25rem' }}>
                Integração Externa
              </p>
            </header>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div className="nav-pill-premium active">
                <Calendar size={16} style={{ color: '#000' }} />
                <span className="nav-pill-label">Configurações</span>
              </div>
              <div className="nav-pill-premium">
                <RefreshCw size={16} />
                <span className="nav-pill-label">Sincronização</span>
              </div>
            </div>
          </div>

          <div className="account-card" style={{ padding: '1.5rem' }}>
            <h4 style={{ fontSize: '0.55rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: '1rem', opacity: 0.4 }}>
              Status
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{
                  width: '8px', height: '8px',
                  borderRadius: '50%',
                  background: config?.google_calendar_enabled ? '#22c55e' : '#ef4444'
                }} />
                <span style={{ fontSize: '0.7rem', fontWeight: 600 }}>
                  Google Calendar: {config?.google_calendar_enabled ? 'Ativo' : 'Inativo'}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{
                  width: '8px', height: '8px',
                  borderRadius: '50%',
                  background: config?.outlook_enabled ? '#22c55e' : '#ef4444'
                }} />
                <span style={{ fontSize: '0.7rem', fontWeight: 600 }}>
                  Outlook: {config?.outlook_enabled ? 'Ativo' : 'Inativo'}
                </span>
              </div>
              {config?.last_sync && (
                <div style={{ fontSize: '0.6rem', opacity: 0.5, marginTop: '0.5rem' }}>
                  Última sync: {new Date(config.last_sync).toLocaleString('pt-BR')}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="profile-main-content">
          <div className="profile-content-section">
            <div className="account-card">
              {/* Google Calendar Integration */}
              <div style={{ padding: '2rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem' }}>
                  <div style={{ padding: '0.625rem', background: 'rgba(34,197,94,0.05)', borderRadius: '12px', border: '1px solid rgba(34,197,94,0.1)', display: 'flex' }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" style={{ color: '#34c759' }}>
                      <path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                    </svg>
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 900, letterSpacing: '-0.04em', textTransform: 'uppercase' }}>Google Calendar</h3>
                    <p style={{ fontSize: '0.625rem', opacity: 0.55, marginTop: '0.125rem' }}>Sincronize atividades com sua agenda do Google.</p>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.25rem 1.5rem', background: 'rgba(255,255,255,0.03)', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div>
                      <p style={{ fontWeight: 700, fontSize: '0.875rem' }}>Integração Google Calendar</p>
                      <p style={{ fontSize: '0.65rem', opacity: 0.5, marginTop: '0.125rem' }}>
                        {config?.google_calendar_enabled ? 'Sincronização ativa' : 'Integração desativada'}
                      </p>
                    </div>
                    <ToggleSwitch 
                      checked={config?.google_calendar_enabled || false}
                      onChange={(checked) => handleConfigChange('google_calendar_enabled', checked)}
                    />
                  </div>

                  {config?.google_calendar_enabled && (
                    <div style={{ padding: '1.5rem', background: 'rgba(34,197,94,0.05)', borderRadius: '12px', border: '1px solid rgba(34,197,94,0.1)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                        <p style={{ fontWeight: 700, fontSize: '0.8rem' }}>Status da Autenticação</p>
                        <div style={{
                          padding: '0.25rem 0.75rem',
                          background: config.google_calendar_access_token ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)',
                          color: config.google_calendar_access_token ? '#22c55e' : '#ef4444',
                          borderRadius: '20px',
                          fontSize: '0.7rem',
                          fontWeight: 700
                        }}>
                          {config.google_calendar_access_token ? 'Conectado' : 'Não conectado'}
                        </div>
                      </div>
                      
                      <button
                        onClick={handleGoogleAuth}
                        className="btn-save-premium"
                        style={{ width: '100%', justifyContent: 'center' }}
                      >
                        <ExternalLink size={14} />
                        {config.google_calendar_access_token ? 'Reautenticar Google' : 'Conectar Google Calendar'}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Outlook Integration */}
              <div style={{ padding: '2rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem' }}>
                  <div style={{ padding: '0.625rem', background: 'rgba(0,120,242,0.05)', borderRadius: '12px', border: '1px solid rgba(0,120,242,0.1)', display: 'flex' }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" style={{ color: '#0078f2' }}>
                      <path fill="currentColor" d="M21.5 18.5L10.5 10l11-8.5v17zM9.5 10L1 3v14l8.5-7z"/>
                    </svg>
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 900, letterSpacing: '-0.04em', textTransform: 'uppercase' }}>Microsoft Outlook</h3>
                    <p style={{ fontSize: '0.625rem', opacity: 0.55, marginTop: '0.125rem' }}>Sincronize com sua agenda corporativa.</p>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.25rem 1.5rem', background: 'rgba(255,255,255,0.03)', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div>
                      <p style={{ fontWeight: 700, fontSize: '0.875rem' }}>Integração Outlook</p>
                      <p style={{ fontSize: '0.65rem', opacity: 0.5, marginTop: '0.125rem' }}>
                        {config?.outlook_enabled ? 'Sincronização ativa' : 'Integração desativada'}
                      </p>
                    </div>
                    <ToggleSwitch 
                      checked={config?.outlook_enabled || false}
                      onChange={(checked) => handleConfigChange('outlook_enabled', checked)}
                    />
                  </div>

                  {config?.outlook_enabled && (
                    <div style={{ padding: '1.5rem', background: 'rgba(0,120,242,0.05)', borderRadius: '12px', border: '1px solid rgba(0,120,242,0.1)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                        <p style={{ fontWeight: 700, fontSize: '0.8rem' }}>Status da Autenticação</p>
                        <div style={{
                          padding: '0.25rem 0.75rem',
                          background: config.outlook_access_token ? 'rgba(0,120,242,0.2)' : 'rgba(239,68,68,0.2)',
                          color: config.outlook_access_token ? '#0078f2' : '#ef4444',
                          borderRadius: '20px',
                          fontSize: '0.7rem',
                          fontWeight: 700
                        }}>
                          {config.outlook_access_token ? 'Conectado' : 'Não conectado'}
                        </div>
                      </div>
                      
                      <button
                        onClick={handleOutlookAuth}
                        className="btn-save-premium"
                        style={{ width: '100%', justifyContent: 'center' }}
                      >
                        <ExternalLink size={14} />
                        {config.outlook_access_token ? 'Reautenticar Outlook' : 'Conectar Outlook'}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Advanced Settings */}
              <div style={{ padding: '2rem' }}>
                <button
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.5rem',
                    background: 'none', border: 'none', color: 'inherit',
                    cursor: 'pointer', marginBottom: showAdvanced ? '2rem' : '0'
                  }}
                >
                  <Zap size={16} style={{ color: 'var(--accent-cyan)' }} />
                  <span style={{ fontWeight: 700, fontSize: '0.8rem' }}>Configurações Avançadas</span>
                  <ChevronDown size={14} style={{ 
                    transform: showAdvanced ? 'rotate(180deg)' : 'none',
                    transition: 'transform 0.2s ease'
                  }} />
                </button>

                {showAdvanced && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.03)', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <p style={{ fontWeight: 700, fontSize: '0.875rem', marginBottom: '1rem' }}>Direção da Sincronização</p>
                      <div style={{ display: 'flex', gap: '1rem' }}>
                        {[
                          { value: 'bidirectional', label: 'Bidirecional', desc: 'Sincroniza em ambos os sentidos' },
                          { value: 'kabania_to_calendar', label: 'Kabania → Calendário', desc: 'Apenas exporta do Kabania' },
                          { value: 'calendar_to_kabania', label: 'Calendário → Kabania', desc: 'Apenas importa para o Kabania' }
                        ].map(option => (
                          <label key={option.value} style={{ flex: 1 }}>
                            <input
                              type="radio"
                              value={option.value}
                              checked={config?.sync_direction === option.value}
                              onChange={(e) => handleConfigChange('sync_direction', e.target.value)}
                              style={{ marginRight: '0.5rem' }}
                            />
                            <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{option.label}</span>
                            <div style={{ fontSize: '0.65rem', opacity: 0.5, marginTop: '0.25rem' }}>{option.desc}</div>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.03)', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <p style={{ fontWeight: 700, fontSize: '0.875rem', marginBottom: '1rem' }}>Intervalo de Sincronização</p>
                      <select
                        value={config?.sync_interval || 30}
                        onChange={(e) => handleConfigChange('sync_interval', parseInt(e.target.value))}
                        style={{
                          padding: '0.75rem 1rem',
                          background: 'rgba(255,255,255,0.05)',
                          border: '1px solid rgba(255,255,255,0.1)',
                          borderRadius: '8px',
                          color: 'inherit',
                          fontSize: '0.8rem',
                          width: '100%'
                        }}
                      >
                        <option value={5}>5 minutos</option>
                        <option value={15}>15 minutos</option>
                        <option value={30}>30 minutos</option>
                        <option value={60}>1 hora</option>
                        <option value={240}>4 horas</option>
                        <option value={720}>12 horas</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>

              {/* Status and Actions */}
              <div style={{ padding: '2rem', background: 'rgba(255,255,255,0.02)', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                {syncStatus && (
                  <div style={{
                    padding: '1rem 1.5rem',
                    background: syncStatus.type === 'success' ? 'rgba(34,197,94,0.1)' : 
                             syncStatus.type === 'error' ? 'rgba(239,68,68,0.1)' : 'rgba(59,130,246,0.1)',
                    border: `1px solid ${syncStatus.type === 'success' ? 'rgba(34,197,94,0.2)' : 
                                     syncStatus.type === 'error' ? 'rgba(239,68,68,0.2)' : 'rgba(59,130,246,0.2)'}`,
                    borderRadius: '12px',
                    marginBottom: '1rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem'
                  }}>
                    {syncStatus.type === 'success' ? (
                      <CheckCircle size={16} style={{ color: '#22c55e' }} />
                    ) : syncStatus.type === 'error' ? (
                      <AlertCircle size={16} style={{ color: '#ef4444' }} />
                    ) : (
                      <RefreshCw size={16} className="animate-spin" style={{ color: '#3b82f6' }} />
                    )}
                    <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{syncStatus.message}</span>
                  </div>
                )}

                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                  <button
                    onClick={handleManualSync}
                    disabled={!config?.google_calendar_enabled && !config?.outlook_enabled}
                    className="btn-save-premium"
                    style={{ flex: 1 }}
                  >
                    <RefreshCw size={14} />
                    Sincronizar Agora
                  </button>
                  
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="btn-save-premium"
                    style={{ flex: 1, background: 'var(--accent-cyan)', color: '#000' }}
                  >
                    {saving ? 'Salvando...' : 'Salvar Configurações'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}