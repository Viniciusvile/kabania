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
              <h2 className="text-3xl font-black mt-4 mb-2 box-border" style={{ color: "var(--text-main)" }}>{currentPlan}</h2>
              <p className="text-sm text-muted mb-8">Sua assinatura está ativa para <strong style={{ color: "var(--text-main)" }}>{currentCompany?.name}</strong>.</p>
              
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
            <h3 className="settings-section-title">
              <Clock size={18} className="text-accent" /> Histórico de Faturas
            </h3>
            <div className="settings-list">
              {[
                { date: '15 Mar, 2026', amount: 'R$ 0,00', status: 'Processado' },
                { date: '15 Fev, 2026', amount: 'R$ 0,00', status: 'Processado' }
              ].map((inv, idx) => (
                <div key={idx} className="settings-item inv-history-row">
                  <div className="inv-history-info">
                    <div className="inv-history-icon-box">
                      <FileText size={20} />
                    </div>
                    <div>
                      <p className="inv-history-title">Fatura Mensal - {inv.date}</p>
                      <p className="inv-history-id">ID: #INV-00{idx + 1}84</p>
                    </div>
                  </div>
                  <div>
                    <p className="inv-history-amount">{inv.amount}</p>
                    <p className="inv-history-status">{inv.status}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar area */}
        <div className="space-y-6">
          <div className="account-section">
            <h3 className="settings-section-title">
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
                    <span className="usage-meter-label">{limit.label}</span>
                    <span className="usage-meter-value">{limit.value}</span>
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
            <h4 className="font-bold text-sm mb-2" style={{ color: "var(--text-main)" }}>Conformidade LGPD</h4>
            <p className="text-[11px] text-muted leading-relaxed">
              Seus dados empresariais estão protegidos com criptografia de ponta a ponta.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
