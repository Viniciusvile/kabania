import React from 'react';
import { FileText, CreditCard, Zap, Check, ArrowUpRight, Clock, ShieldCheck } from 'lucide-react';
import './Dashboard.css';

export default function BillingView({ currentCompany }) {
  const currentPlan = "Plano Business (Trial)";
  
  const features = [
    "Gestão Ilimitada de Projetos",
    "IA Generativa para Insights",
    "Integração com Google Calendar",
    "Histórico Empresarial Permanente",
    "Suporte Prioritário 24/7",
    "Base de Conhecimento Ilimitada"
  ];

  return (
    <div className="p-8 animate-fade-in" style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <FileText size={28} className="text-accent" /> Faturamento
        </h1>
        <p className="text-muted text-sm mt-1">Gerencie sua assinatura, visualize faturas e entenda os limites da sua empresa.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Current Plan */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-panel border border-white/10 rounded-2xl p-8 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-6 opacity-5">
              <Zap size={120} className="text-accent" />
            </div>
            
            <div className="relative z-10">
              <span className="px-3 py-1 bg-accent/20 border border-accent/30 rounded-full text-[10px] font-bold text-accent uppercase tracking-widest">Plano Atual</span>
              <h2 className="text-3xl font-black text-white mt-4 mb-2">{currentPlan}</h2>
              <p className="text-muted text-sm mb-8">Sua assinatura está ativa e sendo gerida para a empresa <strong className="text-white">{currentCompany?.name}</strong>.</p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {features.map((feature, idx) => (
                  <div key={idx} className="flex items-center gap-3 text-sm text-muted/80">
                    <div className="w-5 h-5 rounded-full bg-accent/10 flex items-center justify-center text-accent">
                      <Check size={12} />
                    </div>
                    {feature}
                  </div>
                ))}
              </div>

              <div className="mt-10 pt-8 border-t border-white/5 flex flex-wrap gap-4">
                <button className="px-6 py-3 bg-accent text-[#001820] rounded-xl font-bold hover:scale-105 active:scale-100 transition-all shadow-lg shadow-accent/20 flex items-center gap-2">
                  Upgrade de Plano <ArrowUpRight size={18} />
                </button>
                <button className="px-6 py-3 bg-white/5 border border-white/10 rounded-xl font-bold text-white hover:bg-white/10 transition-all">
                  Cancelar Trial
                </button>
              </div>
            </div>
          </div>

          {/* Billing History */}
          <div className="bg-panel border border-white/10 rounded-2xl p-6 shadow-xl">
            <h3 className="text-white font-bold mb-6 flex items-center gap-2">
              <Clock size={18} className="text-accent" /> Histórico de Faturas
            </h3>
            <div className="space-y-2">
              {[
                { date: '15 Mar, 2026', amount: 'R$ 0,00', status: 'Processado' },
                { date: '15 Fev, 2026', amount: 'R$ 0,00', status: 'Processado' }
              ].map((inv, idx) => (
                <div key={idx} className="flex items-center justify-between p-4 hover:bg-white/3 rounded-xl transition-all border border-transparent hover:border-white/5">
                  <div className="flex items-center gap-4">
                    <FileText size={20} className="text-muted" />
                    <div>
                      <p className="text-sm font-semibold text-white">Mensalidade Business - {inv.date}</p>
                      <p className="text-[10px] text-muted">ID: #INV-00{idx + 1}84</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-white">{inv.amount}</p>
                    <span className="text-[10px] text-green-400 font-bold uppercase">{inv.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Limits & Status */}
        <div className="space-y-6">
          <div className="bg-panel border border-white/10 rounded-2xl p-6 shadow-xl">
            <h3 className="text-white font-bold mb-6 flex items-center gap-2">
              <Zap size={18} className="text-accent" /> Uso da Conta
            </h3>
            <div className="space-y-6">
              {[
                { label: 'Projetos Ativos', value: '4 / 10', percent: 40 },
                { label: 'Time / Membros', value: '5 / 15', percent: 33 },
                { label: 'Armazenamento KB', value: '1.2GB / 5GB', percent: 24 }
              ].map((limit, idx) => (
                <div key={idx}>
                  <div className="flex justify-between text-xs mb-2">
                    <span className="text-muted font-medium">{limit.label}</span>
                    <span className="text-white font-bold">{limit.value}</span>
                  </div>
                  <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-accent shadow-[0_0_10px_rgba(0,229,255,0.3)]" 
                      style={{ width: `${limit.percent}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-panel border border-white/10 rounded-2xl p-6 shadow-xl text-center">
            <div className="w-12 h-12 bg-accent/10 border border-accent/20 rounded-full flex items-center justify-center text-accent mx-auto mb-4">
              <ShieldCheck size={24} />
            </div>
            <h4 className="text-white font-bold text-sm mb-2">Segurança de Dados</h4>
            <p className="text-[11px] text-muted leading-relaxed">
              Sua conta utiliza criptografia de ponta a ponta e conformidade com a LGPD para garantir que seus dados empresariais estejam sempre seguros.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
