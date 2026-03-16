import React from 'react';
import { FileText, CreditCard, Zap, Check, ArrowUpRight, Clock, ShieldCheck } from 'lucide-react';
import './AccountViews.css';

export default function BillingView({ currentCompany }) {
  const currentPlan = "Plano Business (Trial)";
  
  const features = [
    "Gestão Ilimitada de Projetos",
    "IA Generativa para Insights",
    "Integração com Calendar",
    "Histórico Permanente",
    "Suporte Prioritário",
    "KB Ilimitada"
  ];

  return (
    <div className="account-view-container">
      <header className="account-header">
        <h1 className="account-title">
          <FileText size={28} className="text-accent" /> Faturamento
        </h1>
        <p className="account-subtitle">Gerencie sua assinatura, faturas e limites da empresa.</p>
      </header>

      <div className="billing-grid">
        {/* Main Content Area */}
        <div className="space-y-6">
          <div className="account-card billing-main-card">
            <div className="relative z-10">
              <span className="plan-badge">Plano Atual</span>
              <h2 className="text-3xl font-black text-white mt-4 mb-2">{currentPlan}</h2>
              <p className="text-sm text-muted mb-8">Sua assinatura está ativa para <strong className="text-white">{currentCompany?.name}</strong>.</p>
              
              <div className="billing-feature-grid">
                {features.map((feature, idx) => (
                  <div key={idx} className="billing-feature-item">
                    <div className="billing-feature-icon">
                      <Check size={12} />
                    </div>
                    {feature}
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap gap-4 mt-8 pt-8 border-t border-white/5">
                <button className="btn-premium btn-premium-primary">
                  Upgrade de Plano <ArrowUpRight size={18} />
                </button>
                <button className="btn-premium btn-premium-secondary">
                  Cancelar Trial
                </button>
              </div>
            </div>
          </div>

          {/* History */}
          <div className="account-section">
            <h3 className="text-white font-bold mb-6 flex items-center gap-2">
              <Clock size={18} className="text-accent" /> Histórico de Faturas
            </h3>
            <div className="settings-list">
              {[
                { date: '15 Mar, 2026', amount: 'R$ 0,00', status: 'Processado' },
                { date: '15 Fev, 2026', amount: 'R$ 0,00', status: 'Processado' }
              ].map((inv, idx) => (
                <div key={idx} className="settings-item">
                  <div className="flex items-center gap-4">
                    <FileText size={20} className="text-muted" />
                    <div>
                      <p className="text-sm font-bold text-white">Fatura Mensal - {inv.date}</p>
                      <p className="text-[10px] text-muted opacity-60">ID: #INV-00{idx + 1}84</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-white">{inv.amount}</p>
                    <span className="text-[10px] text-green-400 font-bold uppercase tracking-widest">{inv.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar area */}
        <div className="space-y-6">
          <div className="account-section">
            <h3 className="text-white font-bold mb-6 flex items-center gap-2">
              <Zap size={18} className="text-accent" /> Uso da Conta
            </h3>
            <div className="space-y-6">
              {[
                { label: 'Projetos Ativos', value: '4 / 10', percent: 40 },
                { label: 'Time / Membros', value: '5 / 15', percent: 33 },
                { label: 'Armazenamento KB', value: '1.2GB', percent: 24 }
              ].map((limit, idx) => (
                <div key={idx} className="usage-meter-item">
                  <div className="usage-meter-info">
                    <span className="text-muted font-medium">{limit.label}</span>
                    <span className="text-white font-bold">{limit.value}</span>
                  </div>
                  <div className="usage-meter-bar">
                    <div className="usage-meter-fill" style={{ width: `${limit.percent}%` }}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="account-section" style={{ textAlign: 'center' }}>
            <div className="w-12 h-12 bg-accent/10 border border-accent/20 rounded-full flex items-center justify-center text-accent mx-auto mb-4">
              <ShieldCheck size={24} />
            </div>
            <h4 className="text-white font-bold text-sm mb-2">Conformidade LGPD</h4>
            <p className="text-[11px] text-muted leading-relaxed">
              Seus dados empresariais estão protegidos com criptografia de ponta a ponta.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
