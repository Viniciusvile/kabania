import React from 'react';
import { Settings, Moon, Sun, Bell, Globe, Shield, Smartphone } from 'lucide-react';
import './Dashboard.css';

export default function UserSettings({ theme, onToggleTheme }) {
  return (
    <div className="p-8 animate-fade-in" style={{ maxWidth: '800px', margin: '0 auto' }}>
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <Settings size={28} className="text-accent" /> Configurações
        </h1>
        <p className="text-muted text-sm mt-1">Personalize sua experiência e gerencie as preferências do aplicativo.</p>
      </header>

      <div className="space-y-6">
        {/* Appearance Section */}
        <section className="bg-panel border border-white/10 rounded-2xl p-6 shadow-xl">
          <div className="flex items-center gap-2 mb-6 text-white font-bold">
            <Sun size={18} className="text-accent" /> Aparência
          </div>
          <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5">
            <div>
              <p className="text-sm font-semibold text-white">Tema do Sistema</p>
              <p className="text-xs text-muted">Alternar entre modo claro e escuro para melhor conforto visual.</p>
            </div>
            <button 
              onClick={onToggleTheme}
              className="flex items-center gap-2 px-4 py-2 bg-accent/10 border border-accent/20 rounded-lg text-accent hover:bg-accent/20 transition-all font-bold text-xs"
            >
              {theme === 'dark' ? <><Moon size={14} /> Modo Escuro</> : <><Sun size={14} /> Modo Claro</>}
            </button>
          </div>
        </section>

        {/* Notifications Section */}
        <section className="bg-panel border border-white/10 rounded-2xl p-6 shadow-xl">
          <div className="flex items-center gap-2 mb-6 text-white font-bold">
            <Bell size={18} className="text-accent" /> Notificações
          </div>
          <div className="space-y-4">
            {[
              { label: 'Alertas de Projetos', desc: 'Notificar quando uma tarefa for movida ou atribuída.' },
              { label: 'Lembretes de Atividades', desc: 'Alertas sobre solicitações de serviço pendentes.' },
              { label: 'Atualizações da IA', desc: 'Resumos semanais e insights de produtividade.' }
            ].map((item, idx) => (
              <div key={idx} className="flex items-center justify-between p-4 hover:bg-white/3 rounded-xl transition-colors group">
                <div>
                  <p className="text-sm font-semibold text-white group-hover:text-accent transition-colors">{item.label}</p>
                  <p className="text-xs text-muted">{item.desc}</p>
                </div>
                <div className="w-10 h-5 bg-accent/20 rounded-full relative cursor-not-allowed">
                  <div className="absolute right-1 top-1 w-3 h-3 bg-accent rounded-full"></div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Security / System Section */}
        <section className="bg-panel border border-white/10 rounded-2xl p-6 shadow-xl">
          <div className="flex items-center gap-2 mb-6 text-white font-bold">
            <Shield size={18} className="text-accent" /> Segurança e Sistema
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button className="flex items-center gap-3 p-4 bg-white/5 rounded-xl border border-white/5 hover:border-accent/40 transition-all text-left group">
              <Globe size={18} className="text-muted group-hover:text-accent" />
              <div>
                <p className="text-xs font-bold text-white uppercase tracking-tighter">Idioma</p>
                <p className="text-sm text-muted">Português (Brasil)</p>
              </div>
            </button>
            <button className="flex items-center gap-3 p-4 bg-white/5 rounded-xl border border-white/5 hover:border-accent/40 transition-all text-left group">
              <Smartphone size={18} className="text-muted group-hover:text-accent" />
              <div>
                <p className="text-xs font-bold text-white uppercase tracking-tighter">Sessões Ativas</p>
                <p className="text-sm text-muted">Gerenciar dispositivos</p>
              </div>
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
