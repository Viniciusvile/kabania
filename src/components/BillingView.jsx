import React from 'react';
import { FileText, CreditCard, Zap, Check, ArrowUpRight, Clock, ShieldCheck, Sparkles, TrendingUp } from 'lucide-react';
import './AccountViews.css';

export default function BillingView({ currentCompany }) {
  const currentPlan = 'Business Trial';

  const features = [
    'Gestão Ilimitada de Projetos',
    'IA Generativa para Insights',
    'Integração com Calendar',
    'Histórico Permanente',
    'Suporte Prioritário',
    'KB Ilimitada',
  ];

  const invoices = [
    { date: '15 Mar, 2026', amount: 'R$ 0,00', status: 'Processado', id: '#INV-00184' },
    { date: '15 Fev, 2026', amount: 'R$ 0,00', status: 'Processado', id: '#INV-00084' },
  ];

  const usage = [
    { label: 'Projetos Ativos', value: '4 / 10', percent: 40, color: 'var(--accent-cyan)' },
    { label: 'Time / Membros', value: '5 / 15', percent: 33, color: '#a855f7' },
    { label: 'Armazenamento KB', value: '1.2 GB', percent: 24, color: '#22c55e' },
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
                <FileText size={16} style={{ color: '#000' }} />
                <span className="nav-pill-label">Faturamento</span>
              </div>
              <div className="nav-pill-premium">
                <CreditCard size={16} />
                <span className="nav-pill-label">Pagamentos</span>
              </div>
              <div className="nav-pill-premium">
                <TrendingUp size={16} />
                <span className="nav-pill-label">Uso & Limites</span>
              </div>
            </div>
          </div>

          <div className="account-card" style={{ padding: '1.5rem' }}>
            <h4 style={{ fontSize: '0.55rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: '1rem', opacity: 0.4 }}>
              Plano Atual
            </h4>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginBottom: '0.5rem' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 8px rgba(34,197,94,0.5)', animation: 'pulse 2s infinite' }} />
              <span style={{ fontSize: '0.8rem', fontWeight: 900, letterSpacing: '-0.02em' }}>Business Trial</span>
            </div>
            <div style={{ fontSize: '0.6rem', opacity: 0.45, marginTop: '0.25rem' }}>Ativo para {currentCompany?.name || 'sua empresa'}</div>
          </div>
        </div>

        {/* MAIN CONTENT */}
        <div className="profile-main-content">
          <div className="profile-content-section">
            <div className="account-card">

              {/* ── Plano Atual ────────────────────────── */}
              <div style={{ padding: '2rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ padding: '0.625rem', background: 'rgba(0,229,255,0.05)', borderRadius: '12px', border: '1px solid rgba(0,229,255,0.1)', display: 'flex' }}>
                      <CreditCard size={20} style={{ color: 'var(--accent-cyan)' }} />
                    </div>
                    <div>
                      <h3 style={{ fontSize: '1.1rem', fontWeight: 900, letterSpacing: '-0.04em', textTransform: 'uppercase' }}>Plano Atual</h3>
                      <p style={{ fontSize: '0.625rem', opacity: 0.55, marginTop: '0.125rem' }}>Sua assinatura e benefícios ativos.</p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', color: '#22c55e', padding: '0.3rem 0.875rem', borderRadius: '999px', fontSize: '0.65rem', fontWeight: 900 }}>
                    <div style={{ width: '6px', height: '6px', background: '#22c55e', borderRadius: '50%', animation: 'pulse 2s infinite' }} />
                    ATIVO
                  </div>
                </div>

                {/* Plan Hero */}
                <div style={{ background: 'linear-gradient(135deg, rgba(0,229,255,0.06) 0%, rgba(124,58,237,0.06) 100%)', border: '1px solid rgba(0,229,255,0.12)', borderRadius: '20px', padding: '2rem', marginBottom: '1.5rem' }}>
                  <div style={{ fontSize: '0.65rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.15em', opacity: 0.5, marginBottom: '0.5rem' }}>Plano</div>
                  <h2 style={{ fontSize: '2rem', fontWeight: 900, letterSpacing: '-0.05em', marginBottom: '0.375rem' }}>{currentPlan}</h2>
                  <p style={{ fontSize: '0.75rem', opacity: 0.6 }}>
                    Ativo para <strong style={{ opacity: 1 }}>{currentCompany?.name || 'sua empresa'}</strong> — renovação automática
                  </p>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem', marginTop: '1.75rem' }}>
                    {features.map((f, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', fontSize: '0.8rem', fontWeight: 600 }}>
                        <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'rgba(0,229,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <Check size={11} style={{ color: 'var(--accent-cyan)' }} />
                        </div>
                        {f}
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <button className="btn-save-premium" style={{ gap: '0.5rem' }}>
                    <ArrowUpRight size={15} /> Upgrade de Plano
                  </button>
                  <button className="btn-cancel-premium">Cancelar Trial</button>
                </div>
              </div>

              {/* ── Histórico de Faturas ────────────────── */}
              <div style={{ padding: '2rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem' }}>
                  <div style={{ padding: '0.625rem', background: 'rgba(168,85,247,0.05)', borderRadius: '12px', border: '1px solid rgba(168,85,247,0.1)', display: 'flex' }}>
                    <Clock size={20} style={{ color: '#a855f7' }} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 900, letterSpacing: '-0.04em', textTransform: 'uppercase' }}>Histórico de Faturas</h3>
                    <p style={{ fontSize: '0.625rem', opacity: 0.55, marginTop: '0.125rem' }}>Registro de cobranças e pagamentos.</p>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {invoices.map((inv, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.125rem 1.5rem', background: 'rgba(255,255,255,0.03)', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(168,85,247,0.08)', border: '1px solid rgba(168,85,247,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <FileText size={16} style={{ color: '#a855f7' }} />
                        </div>
                        <div>
                          <p style={{ fontWeight: 700, fontSize: '0.875rem' }}>Fatura Mensal — {inv.date}</p>
                          <p style={{ fontSize: '0.65rem', opacity: 0.45, marginTop: '0.125rem' }}>ID: {inv.id}</p>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <p style={{ fontWeight: 900, fontSize: '0.9rem', letterSpacing: '-0.02em' }}>{inv.amount}</p>
                        <p style={{ fontSize: '0.6rem', color: '#22c55e', fontWeight: 700, marginTop: '0.125rem' }}>{inv.status}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Footer */}
              <div style={{ padding: '1.125rem 2rem', background: 'rgba(255,255,255,0.02)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.55rem', fontWeight: 700 }}>
                  <div style={{ width: '6px', height: '6px', background: 'var(--accent-cyan)', borderRadius: '50%' }} />
                  SYNC: OK
                </div>
                <div style={{ fontSize: '0.55rem', fontWeight: 700, opacity: 0.4 }}>BILLING ENGINE v1.2</div>
              </div>
            </div>
          </div>

          {/* SIDE PANEL */}
          <div className="profile-side-panel">
            {/* Usage Card */}
            <div className="identity-card-premium" style={{ alignItems: 'flex-start', padding: '2rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '1.5rem' }}>
                <Zap size={18} style={{ color: 'var(--accent-cyan)' }} />
                <h4 style={{ fontSize: '0.7rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.15em' }}>Uso da Conta</h4>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', width: '100%' }}>
                {usage.map((u, i) => (
                  <div key={i}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                      <span style={{ fontSize: '0.7rem', fontWeight: 700 }}>{u.label}</span>
                      <span style={{ fontSize: '0.7rem', fontWeight: 900, color: u.color }}>{u.value}</span>
                    </div>
                    <div style={{ height: '6px', background: 'rgba(255,255,255,0.06)', borderRadius: '999px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${u.percent}%`, background: u.color, borderRadius: '999px', boxShadow: `0 0 8px ${u.color}66`, transition: 'width 0.6s ease' }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* LGPD Card */}
            <div style={{ background: 'rgba(34,197,94,0.04)', border: '1px solid rgba(34,197,94,0.1)', borderRadius: '20px', padding: '1.75rem', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '0.875rem' }}>
              <div style={{ width: '52px', height: '52px', borderRadius: '14px', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ShieldCheck size={24} style={{ color: '#22c55e' }} />
              </div>
              <h4 style={{ fontWeight: 900, fontSize: '0.875rem', letterSpacing: '-0.02em' }}>Conformidade LGPD</h4>
              <p style={{ fontSize: '0.7rem', opacity: 0.65, lineHeight: '1.6' }}>
                Seus dados empresariais estão protegidos com criptografia de ponta a ponta e em conformidade com a LGPD.
              </p>
            </div>

            {/* AI Tip */}
            <div style={{ background: 'rgba(0,229,255,0.04)', border: '1px solid rgba(0,229,255,0.1)', borderRadius: '20px', padding: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <Sparkles size={14} style={{ color: 'var(--accent-cyan)' }} />
                <h4 style={{ fontSize: '0.65rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.15em' }}>Sincronia IA</h4>
              </div>
              <p style={{ fontSize: '0.75rem', lineHeight: '1.6', opacity: 0.75 }}>
                Faça upgrade para desbloquear análises financeiras com IA, projeções de uso e relatórios automáticos de ROI.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
