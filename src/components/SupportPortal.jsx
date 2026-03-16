import React, { useState } from 'react';
import { LifeBuoy, Send, Sparkles, User, Mail, MessageSquare, ChevronRight, CheckCircle, AlertCircle, ArrowRight, Loader2 } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { processTaskWithAI } from '../services/geminiService';
import { logEvent } from '../services/historyService';
import './AccountViews.css'; // Reuse premium card styles

export default function SupportPortal({ currentUser, currentCompany }) {
  const [step, setStep] = useState(1); // 1: Form, 2: AI Response
  const [ticketData, setTicketData] = useState({
    name: '',
    email: currentUser || '',
    subject: '',
    description: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [aiResponse, setAiResponse] = useState('');
  const [ticketId, setTicketId] = useState(null);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setTicketData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!ticketData.subject || !ticketData.description) return;

    setIsLoading(true);
    try {
      const newId = `tk-${Date.now()}`;
      
      // 1. Save ticket to Supabase
      const { error } = await supabase.from('support_tickets').insert([{
        id: newId,
        company_id: currentCompany?.id,
        client_name: ticketData.name || 'Cliente Anônimo',
        client_email: ticketData.email,
        subject: ticketData.subject,
        description: ticketData.description,
        status: 'pending_ai'
      }]);

      if (error) throw error;
      setTicketId(newId);

      // 2. Get AI Response based on Knowledge Base
      const aiSugestion = await processTaskWithAI(
        `ASSUNTO: ${ticketData.subject}\nDESCRIÇÃO: ${ticketData.description}`,
        currentCompany?.id
      );

      setAiResponse(aiSugestion);
      
      // Update ticket with AI response
      await supabase.from('support_tickets').update({
        ai_response: aiSugestion,
        status: 'ai_replied'
      }).eq('id', newId);

      setStep(2);
      if (currentCompany) {
        logEvent(currentCompany.id, currentUser, 'SUPPORT_TICKET_CREATED', `Ticket ${newId} aberto por ${ticketData.email}`);
      }
    } catch (err) {
      console.error("Error submitting ticket:", err);
      alert("Erro ao enviar chamado. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleEscalate = async () => {
    if (!ticketId) return;
    setIsLoading(true);
    try {
      // 1. Update ticket status
      await supabase.from('support_tickets').update({
        status: 'escalated'
      }).eq('id', ticketId);

      // 2. Create activity for the team
      const actId = String(Math.floor(Math.random() * 90000) + 10000);
      const nowIso = new Date().toISOString();
      
      const { error } = await supabase.from('activities').insert([{
        id: actId,
        location: `Suporte: ${ticketData.name || ticketData.email}`,
        type: 'Suporte Técnico',
        status: 'Pendente',
        description: `CHAMADO: ${ticketData.subject}\n\nCLIENTE: ${ticketData.name} (${ticketData.email})\n\nDESCRIÇÃO: ${ticketData.description}\n\nRESPOSTA DA IA: ${aiResponse}`,
        company_id: currentCompany?.id,
        created_by: 'IA_PORTAL',
        created: nowIso,
        updated: nowIso
      }]);

      if (error) throw error;

      alert("Chamado escalado para nossa equipe técnica. Entraremos em contato em breve!");
      setStep(1);
      setTicketData({
        name: '',
        email: currentUser || '',
        subject: '',
        description: ''
      });
      setAiResponse('');
      setTicketId(null);
    } catch (err) {
      console.error("Error escalating ticket:", err);
      alert("Erro ao escalar chamado.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="account-view-container animate-fade-in">
      <header className="account-header">
        <div className="flex items-center gap-4 mb-2">
          <div className="w-12 h-12 rounded-2xl bg-accent/10 flex items-center justify-center text-accent shadow-lg shadow-accent/5">
            <LifeBuoy size={30} />
          </div>
          <div>
            <h1 className="account-title support-header-gradient text-3xl">
              Central de Atendimento
            </h1>
            <p className="account-subtitle">Suporte Inteligente & Resposta Imediata</p>
          </div>
        </div>
      </header>

      <div className="support-glass-card max-w-3xl mx-auto overflow-hidden support-form-animate">
        {step === 1 ? (
          <form onSubmit={handleSubmit} className="p-8 md:p-10">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-white/70">
                  <MessageSquare size={20} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white tracking-tight">Novo Chamado</h2>
                  <p className="text-xs text-muted/80">IA treinada com sua base de conhecimento</p>
                </div>
              </div>
              <div className="hidden sm:block support-badge-ai">
                <Sparkles size={12} /> IA Triage Ativo
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="form-group">
                <label className="form-label">Seu Nome</label>
                <div className="form-input-wrapper">
                  <User className="form-icon" size={16} />
                  <input 
                    type="text" 
                    name="name"
                    value={ticketData.name}
                    onChange={handleInputChange}
                    className="form-input support-input-premium"
                    placeholder="Como devemos te chamar?"
                    required
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">E-mail de Contato</label>
                <div className="form-input-wrapper">
                  <Mail className="form-icon" size={16} />
                  <input 
                    type="email" 
                    name="email"
                    value={ticketData.email}
                    onChange={handleInputChange}
                    className="form-input support-input-premium"
                    placeholder="seu@email.com"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="form-group mb-6">
              <label className="form-label">Assunto do Chamado</label>
              <div className="form-input-wrapper">
                <AlertCircle className="form-icon" size={16} />
                <input 
                  type="text" 
                  name="subject"
                  value={ticketData.subject}
                  onChange={handleInputChange}
                  className="form-input support-input-premium"
                  placeholder="Ex: Não consigo acessar os relatórios"
                  required
                />
              </div>
            </div>

            <div className="form-group mb-8">
              <label className="form-label">Descrição Detalhada</label>
              <textarea 
                name="description"
                value={ticketData.description}
                onChange={handleInputChange}
                className="form-textarea support-input-premium min-h-[160px] p-4 pt-10"
                placeholder="Explique o que está acontecendo em detalhes..."
                required
              />
              <MessageSquare className="absolute left-4 top-10 text-muted/30" size={18} />
            </div>

            <button 
              type="submit" 
              className="btn-premium btn-premium-primary w-full py-4 text-lg font-bold group"
              disabled={isLoading}
            >
              {isLoading ? (
                <><Loader2 className="animate-spin" size={20} /> Consultando Base de Conhecimento...</>
              ) : (
                <><Send size={20} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" /> Enviar para Análise</>
              )}
            </button>
          </form>
        ) : (
          <div className="support-form-animate">
            <div className="bg-accent/10 p-8 md:p-10 border-b border-white/5 support-ai-glow">
              <div className="flex items-center justify-between mb-6">
                <div className="support-badge-ai">
                  <Sparkles size={14} /> Sugestão da IA Synapse
                </div>
                <div className="text-xs text-muted/60">Análise concluída em segundos</div>
              </div>
              <div className="bg-slate-900/60 backdrop-blur-md rounded-2xl p-8 border border-accent/20 text-slate-100 leading-relaxed text-lg shadow-inner">
                {aiResponse}
              </div>
            </div>

            <div className="p-8 md:p-10 bg-slate-900/40">
              <div className="flex flex-col md:flex-row gap-6 items-center justify-between">
                <div>
                  <h4 className="text-white font-bold mb-1">A solução funcionou?</h4>
                  <p className="text-muted text-sm max-w-sm">
                    Nossa IA tenta resolver seu problema usando a documentação da empresa.
                  </p>
                </div>
                <div className="flex gap-4 w-full md:w-auto">
                  <button 
                    onClick={() => {
                        setStep(1);
                        setTicketData({name:'', email: currentUser||'', subject: '', description: ''});
                    }}
                    className="btn-premium bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 flex-1 md:flex-initial"
                  >
                    <CheckCircle size={18} /> Resolvido
                  </button>
                  <button 
                    onClick={handleEscalate}
                    className="btn-premium btn-premium-primary flex-1 md:flex-initial shadow-lg shadow-accent/20"
                    disabled={isLoading}
                  >
                    {isLoading ? <Loader2 className="animate-spin" size={18} /> : <><ArrowRight size={18} /> Chamar Especialista</>}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="support-divider-fancy" />

      <footer className="footer-links text-center text-muted/40 text-[10px] uppercase tracking-widest pb-8">
        PLATAFORMA KABANIA — NÚCLEO DE SUPORTE AUTOMATIZADO
      </footer>
    </div>
  );
}
