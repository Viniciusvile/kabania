import React from 'react';
import { Settings, Moon, Sun, Bell, Globe, Shield, Smartphone } from 'lucide-react';
import './AccountViews.css';

export default function UserSettings({ theme, onToggleTheme }) {
  return (
    <div className="account-view-container">
      <header className="account-header">
        <h1 className="account-title">
          <Settings size={28} className="text-accent" /> Configurações
        </h1>
        <p className="account-subtitle">Personalize sua experiência e gerencie as preferências do aplicativo.</p>
      </header>

      <div className="space-y-6">
        {/* Appearance Section */}
        <section className="account-section">
          <div className="settings-section-title">
            <Sun size={18} className="text-accent" /> Aparência
          </div>
          <div className="settings-item">
            <div className="settings-info">
              <h4>Tema do Sistema</h4>
              <p>Alternar entre modo claro e escuro para melhor conforto visual.</p>
            </div>
            <button 
              onClick={onToggleTheme}
              className="btn-premium btn-premium-secondary" style={{ padding: '0.6rem 1rem', fontSize: '0.8rem' }}
            >
              {theme === 'dark' ? <><Moon size={14} /> Modo Escuro</> : <><Sun size={14} /> Modo Claro</>}
            </button>
          </div>
        </section>

        {/* Notifications Section */}
        <section className="account-section">
          <div className="settings-section-title">
            <Bell size={18} className="text-accent" /> Notificações
          </div>
          <div className="settings-list">
            {[
              { label: 'Alertas de Projetos', desc: 'Notificar quando uma tarefa for movida ou atribuída.' },
              { label: 'Lembretes de Atividades', desc: 'Alertas sobre solicitações de serviço pendentes.' },
              { label: 'Atualizações da IA', desc: 'Resumos semanais e insights de produtividade.' }
            ].map((item, idx) => (
              <div key={idx} className="settings-item">
                <div className="settings-info">
                  <h4>{item.label}</h4>
                  <p>{item.desc}</p>
                </div>
                <div className="w-10 h-5 bg-accent/20 rounded-full relative cursor-not-allowed">
                  <div className="absolute right-1 top-1 w-3 h-3 bg-accent rounded-full"></div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Security / System Section */}
        <section className="account-section">
          <div className="settings-section-title">
            <Shield size={18} className="text-accent" /> Segurança e Sistema
          </div>
          <div className="settings-cards-grid">
            <button className="settings-card">
              <Globe size={18} className="settings-card-icon" />
              <div>
                <p className="settings-card-subtitle">Idioma</p>
                <p className="settings-card-title">Português (Brasil)</p>
              </div>
            </button>
            <button className="settings-card">
              <Smartphone size={18} className="settings-card-icon" />
              <div>
                <p className="settings-card-subtitle">Sessões Ativas</p>
                <p className="settings-card-title">Gerenciar dispositivos</p>
              </div>
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
