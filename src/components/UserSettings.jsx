import React, { useState } from 'react';
import { Settings, Moon, Sun, Bell, Globe, Shield, Smartphone, Sparkles, Monitor, AtSign, Zap } from 'lucide-react';
import './AccountViews.css';

const ToggleSwitch = ({ checked, onChange }) => (
  <button
    onClick={() => onChange(!checked)}
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

export default function UserSettings({ theme, onSetTheme }) {
  const [notifications, setNotifications] = useState({
    projects: true,
    activities: true,
    ai: false,
  });

  const toggleNotif = (key) => setNotifications(prev => ({ ...prev, [key]: !prev[key] }));

  const notifItems = [
    { key: 'projects', label: 'Alertas de Projetos', desc: 'Notificar quando uma tarefa for movida ou atribuída.' },
    { key: 'activities', label: 'Lembretes de Atividades', desc: 'Alertas sobre solicitações de serviço pendentes.' },
    { key: 'ai', label: 'Atualizações da IA', desc: 'Resumos semanais e insights de produtividade.' },
  ];

  const themes = [
    { id: 'light', label: 'Light', icon: <Sun size={20} />, activeColor: '#f59e0b', desc: 'Visual claro e limpo' },
    { id: 'dark', label: 'Dark', icon: <Moon size={20} />, activeColor: 'var(--accent-cyan)', desc: 'Foco e conforto visual' },
    { id: 'green', label: 'Emerald', icon: <Sparkles size={20} />, activeColor: '#04D94F', desc: 'Estética High-Tech Verde' },
  ];

  return (
    <div className="account-view-container">
      <div className="profile-dashboard-grid">

        {/* LEFT SIDEBAR */}
        <div className="profile-left-sidebar">
          <div className="account-card" style={{ padding: '1.5rem' }}>
            <header style={{ marginBottom: '1.5rem', paddingLeft: '0.25rem' }}>
              <h1 style={{ fontSize: '1.25rem', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '0.5rem', letterSpacing: '-0.05em' }}>
                <Sparkles size={20} style={{ color: 'var(--accent-cyan)' }} /> SYNAPSE
              </h1>
              <p style={{ fontSize: '0.6rem', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.2em', opacity: 0.4, marginTop: '0.25rem' }}>
                Core Terminal
              </p>
            </header>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div className="nav-pill-premium active">
                <Settings size={16} style={{ color: '#000' }} />
                <span className="nav-pill-label">Configurações</span>
              </div>
              <div className="nav-pill-premium">
                <Bell size={16} />
                <span className="nav-pill-label">Notificações</span>
              </div>
              <div className="nav-pill-premium">
                <Shield size={16} />
                <span className="nav-pill-label">Segurança</span>
              </div>
            </div>
          </div>

          <div className="account-card" style={{ padding: '1.5rem' }}>
            <h4 style={{ fontSize: '0.55rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: '1rem', opacity: 0.4 }}>
              Sistema
            </h4>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              {theme === 'dark' ? <Moon size={14} style={{ color: 'var(--accent-cyan)' }} /> : 
               theme === 'light' ? <Sun size={14} style={{ color: '#f59e0b' }} /> :
               <Sparkles size={14} style={{ color: '#04D94F' }} />}
              <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>
                Modo {theme === 'dark' ? 'Escuro' : theme === 'light' ? 'Claro' : 'Emerald'}
              </span>
            </div>
            <div style={{ fontSize: '0.6rem', opacity: 0.45, marginTop: '0.25rem' }}>v2.4.1 — build estável</div>
          </div>
        </div>

        {/* MAIN CONTENT */}
        <div className="profile-main-content">
          <div className="profile-content-section">
            <div className="account-card">

              {/* ── Aparência ────────────────────────── */}
              <div style={{ padding: '2rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                  <div style={{ padding: '0.625rem', background: 'rgba(0,229,255,0.05)', borderRadius: '12px', border: '1px solid rgba(0,229,255,0.1)', display: 'flex' }}>
                    <Monitor size={20} style={{ color: 'var(--accent-cyan)' }} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 900, letterSpacing: '-0.04em', textTransform: 'uppercase' }}>Aparência</h3>
                    <p style={{ fontSize: '0.625rem', opacity: 0.55, marginTop: '0.125rem' }}>Personalize o tema visual da interface.</p>
                  </div>
                </div>

                {/* Theme Selection Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
                  {themes.map(t => (
                    <button
                      key={t.id}
                      onClick={() => onSetTheme(t.id)}
                      style={{
                        padding: '1.25rem',
                        borderRadius: '16px',
                        background: theme === t.id ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.02)',
                        border: `1px solid ${theme === t.id ? t.activeColor : 'rgba(255,255,255,0.06)'}`,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '0.75rem',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        boxShadow: theme === t.id ? `0 8px 24px -8px ${t.activeColor}` : 'none',
                        position: 'relative',
                        overflow: 'hidden'
                      }}
                    >
                      {theme === t.id && (
                        <div style={{ 
                          position: 'absolute', 
                          top: '10px', 
                          right: '10px', 
                          width: '8px', 
                          height: '8px', 
                          borderRadius: '50%', 
                          background: t.activeColor,
                          boxShadow: `0 0 8px ${t.activeColor}`
                        }} />
                      )}
                      <div style={{ 
                        color: theme === t.id ? t.activeColor : 'rgba(255,255,255,0.4)',
                        transition: 'color 0.2s ease'
                      }}>
                        {t.icon}
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <p style={{ fontWeight: 800, fontSize: '0.8rem', color: theme === t.id ? '#fff' : 'rgba(255,255,255,0.6)' }}>{t.label}</p>
                        <p style={{ fontSize: '0.6rem', opacity: 0.4, marginTop: '2px' }}>{t.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* ── Notificações ─────────────────────── */}
              <div style={{ padding: '2rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem' }}>
                  <div style={{ padding: '0.625rem', background: 'rgba(168,85,247,0.05)', borderRadius: '12px', border: '1px solid rgba(168,85,247,0.1)', display: 'flex' }}>
                    <Bell size={20} style={{ color: '#a855f7' }} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 900, letterSpacing: '-0.04em', textTransform: 'uppercase' }}>Notificações</h3>
                    <p style={{ fontSize: '0.625rem', opacity: 0.55, marginTop: '0.125rem' }}>Controle o que você deseja ser alertado.</p>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {notifItems.map(item => (
                    <div key={item.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.125rem 1.5rem', background: 'rgba(255,255,255,0.03)', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <div>
                        <p style={{ fontWeight: 700, fontSize: '0.875rem' }}>{item.label}</p>
                        <p style={{ fontSize: '0.65rem', opacity: 0.5, marginTop: '0.125rem' }}>{item.desc}</p>
                      </div>
                      <ToggleSwitch checked={notifications[item.key]} onChange={() => toggleNotif(item.key)} />
                    </div>
                  ))}
                </div>
              </div>

              {/* ── Segurança & Sistema ───────────────── */}
              <div style={{ padding: '2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem' }}>
                  <div style={{ padding: '0.625rem', background: 'rgba(34,197,94,0.05)', borderRadius: '12px', border: '1px solid rgba(34,197,94,0.1)', display: 'flex' }}>
                    <Shield size={20} style={{ color: '#22c55e' }} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 900, letterSpacing: '-0.04em', textTransform: 'uppercase' }}>Segurança & Sistema</h3>
                    <p style={{ fontSize: '0.625rem', opacity: 0.55, marginTop: '0.125rem' }}>Idioma, sessões e controles de acesso.</p>
                  </div>
                </div>
                <div className="profile-grid-premium">
                  {[
                    { icon: <Globe size={20} />, label: 'Idioma', value: 'Português (Brasil)', color: 'rgba(0,229,255,0.05)', border: 'rgba(0,229,255,0.12)', iconColor: 'var(--accent-cyan)' },
                    { icon: <Smartphone size={20} />, label: 'Sessões Ativas', value: 'Gerenciar dispositivos', color: 'rgba(168,85,247,0.05)', border: 'rgba(168,85,247,0.12)', iconColor: '#a855f7' },
                    { icon: <AtSign size={20} />, label: 'Autenticação 2FA', value: 'Não configurado', color: 'rgba(239,68,68,0.05)', border: 'rgba(239,68,68,0.12)', iconColor: '#ef4444' },
                    { icon: <Zap size={20} />, label: 'API Tokens', value: '2 tokens ativos', color: 'rgba(245,158,11,0.05)', border: 'rgba(245,158,11,0.12)', iconColor: '#f59e0b' },
                  ].map((card, i) => (
                    <button key={i} style={{ background: card.color, border: `1px solid ${card.border}`, borderRadius: '16px', padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.875rem', cursor: 'pointer', textAlign: 'left', transition: 'transform 0.2s, box-shadow 0.2s' }}
                      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 20px rgba(0,0,0,0.1)'; }}
                      onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}
                    >
                      <div style={{ color: card.iconColor }}>{card.icon}</div>
                      <div>
                        <p style={{ fontSize: '0.65rem', opacity: 0.5, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 800 }}>{card.label}</p>
                        <p style={{ fontWeight: 700, fontSize: '0.875rem', marginTop: '0.125rem' }}>{card.value}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Footer */}
              <div style={{ padding: '1.125rem 2rem', background: 'rgba(255,255,255,0.02)', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.55rem', fontWeight: 700 }}>
                  <div style={{ width: '6px', height: '6px', background: 'var(--accent-cyan)', borderRadius: '50%' }} />
                  SYNC: OK
                </div>
                <div style={{ fontSize: '0.55rem', fontWeight: 700, opacity: 0.4 }}>CONFIGURAÇÕES v2.4.1</div>
              </div>
            </div>
          </div>

          {/* SIDE PANEL */}
          <div className="profile-side-panel">
            <div className="identity-card-premium">
              <div style={{ width: '72px', height: '72px', borderRadius: '20px', background: 'linear-gradient(135deg, var(--accent-cyan), #7C3AED)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.25rem', boxShadow: '0 12px 30px rgba(0,0,0,0.2)' }}>
                <Settings size={32} style={{ color: '#fff' }} />
              </div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 900, letterSpacing: '-0.04em' }}>Configurações</h2>
              <p style={{ fontSize: '0.65rem', opacity: 0.5, marginTop: '0.375rem', textAlign: 'center', lineHeight: '1.5' }}>Preferências e controles do sistema Synapse.</p>

              <div className="id-stat-grid" style={{ marginTop: '1.75rem' }}>
                <div className="id-stat-pill">
                  <span className="id-stat-value" style={{ fontSize: '1rem' }}>3</span>
                  <span className="id-stat-label">Notificações</span>
                </div>
                <div className="id-stat-pill">
                  <span className="id-stat-value" style={{ fontSize: '1rem', color: '#22c55e' }}>OK</span>
                  <span className="id-stat-label">Status</span>
                </div>
              </div>
            </div>

            {/* AI Tip */}
            <div style={{ background: 'rgba(0,229,255,0.04)', border: '1px solid rgba(0,229,255,0.1)', borderRadius: '20px', padding: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <Sparkles size={14} style={{ color: 'var(--accent-cyan)' }} />
                <h4 style={{ fontSize: '0.65rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.15em' }}>Sincronia IA</h4>
              </div>
              <p style={{ fontSize: '0.75rem', lineHeight: '1.6', opacity: 0.75 }}>
                Ative notificações de IA para receber resumos semanais de produtividade e alertas inteligentes baseados no seu fluxo de trabalho.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
