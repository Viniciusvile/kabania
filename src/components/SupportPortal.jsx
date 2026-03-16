import React, { useState } from 'react';
import { LifeBuoy, Send, Sparkles, User, Mail, MessageSquare, ChevronRight, CheckCircle, AlertCircle, ArrowRight, Loader2 } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { processTaskWithAI } from '../services/geminiService';
import { logEvent } from '../services/historyService';
import './SupportPortal.css'; // New ultra-premium styles

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

      const aiSugestion = await processTaskWithAI(
        `ASSUNTO: ${ticketData.subject}\nDESCRIÇÃO: ${ticketData.description}`,
        currentCompany?.id
      );

      setAiResponse(aiSugestion);
      
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
      await supabase.from('support_tickets').update({
        status: 'escalated'
      }).eq('id', ticketId);

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
    <div className="support-portal-wrapper animate-fade-in">
      {/* Decorative background blobs */}
      <div className="support-bg-blobs">
        <div className="blob blob-1"></div>
        <div className="blob blob-2"></div>
        <div className="blob blob-3"></div>
      </div>

      <header className="text-center mb-12 relative z-10">
        <h1 className="support-title-hero">Central de Atendimento</h1>
        <p className="support-subtitle-hero">
          Abra um chamado e receba uma solução inteligente instantaneamente usando nossa Base de Conhecimento.
        </p>
      </header>

      <div className="support-ultra-card relative z-10 support-form-animate">
        {step === 1 ? (
          <form onSubmit={handleSubmit} className="p-10 md:p-14">
            <div className="flex items-center justify-between mb-12">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-accent shadow-lg border border-white/5">
                  <MessageSquare size={24} />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white tracking-tight">Novo Chamado</h2>
                  <p className="text-sm text-muted">Inteligência Artificial Ativa</p>
                </div>
              </div>
              <div className="hidden sm:flex support-badge-ai">
                <Sparkles size={14} /> AI Triage System
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
              <div className="premium-input-group">
                <label className="premium-label">Seu Nome</label>
                <div className="premium-input-container">
                  <User className="premium-input-icon" size={18} />
                  <input 
                    type="text" 
                    name="name"
                    value={ticketData.name}
                    onChange={handleInputChange}
                    className="premium-input-field"
                    placeholder="Como devemos te chamar?"
                    required
                  />
                </div>
              </div>
              <div className="premium-input-group">
                <label className="premium-label">E-mail de Contato</label>
                <div className="premium-input-container">
                  <Mail className="premium-input-icon" size={18} />
                  <input 
                    type="email" 
                    name="email"
                    value={ticketData.email}
                    onChange={handleInputChange}
                    className="premium-input-field"
                    placeholder="seu@email.com"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="premium-input-group mb-8">
              <label className="premium-label">Assunto do Chamado</label>
              <div className="premium-input-container">
                <AlertCircle className="premium-input-icon" size={18} />
                <input 
                  type="text" 
                  name="subject"
                  value={ticketData.subject}
                  onChange={handleInputChange}
                  className="premium-input-field"
                  placeholder="Resuma o problema de forma clara"
                  required
                />
              </div>
            </div>

            <div className="premium-input-group mb-12">
              <label className="premium-label">Descrição Detalhada</label>
              <div className="premium-input-container">
                <MessageSquare className="premium-input-icon" style={{ top: '1.5rem', transform: 'none' }} size={18} />
                <textarea 
                  name="description"
                  value={ticketData.description}
                  onChange={handleInputChange}
                  className="premium-input-field premium-textarea"
                  placeholder="Explique o que está acontecendo... Quanto mais detalhes, melhor será a resposta da IA."
                  required
                />
              </div>
            </div>

            <button 
              type="submit" 
              className="btn-ultra-submit group"
              disabled={isLoading}
            >
              {isLoading ? (
                <><Loader2 className="animate-spin" size={24} /> Analisando Contexto...</>
              ) : (
                <><Send size={24} /> Enviar Chamado</>
              )}
            </button>
          </form>
        ) : (
          <div className="support-form-animate">
            <div className="ai-response-container support-ai-glow">
              <div className="flex items-center justify-between mb-8">
                <div className="support-badge-ai">
                  <Sparkles size={16} /> Resposta Inteligente
                </div>
                <div className="text-xs text-slate-500 font-mono">ID: {ticketId}</div>
              </div>
              
              <div className="ai-suggestion-box mb-10">
                <div className="ai-text">
                  {aiResponse}
                </div>
              </div>

              <div className="bg-white/5 rounded-3xl p-8 border border-white/5">
                <div className="flex flex-col md:flex-row gap-8 items-center justify-between">
                  <div>
                    <h4 className="text-white text-xl font-bold mb-2">Isso ajudou você?</h4>
                    <p className="text-slate-400 text-sm max-w-sm">
                      Se a resposta da nossa IA resolveu sua dúvida, você pode encerrar este chamado agora. Caso contrário, fale com nossa equipe técnica.
                    </p>
                  </div>
                  <div className="flex gap-4 w-full md:w-auto">
                    <button 
                      onClick={() => {
                          setStep(1);
                          setTicketData({name:'', email: currentUser||'', subject: '', description: ''});
                      }}
                      className="btn-premium bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 px-8 py-4"
                    >
                      <CheckCircle size={20} /> Resolvido
                    </button>
                    <button 
                      onClick={handleEscalate}
                      className="btn-ultra-submit flex-1 md:flex-initial py-4 px-8"
                      disabled={isLoading}
                    >
                      {isLoading ? <Loader2 className="animate-spin" size={20} /> : <><ArrowRight size={20} /> Escalar p/ Equipe</>}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <footer className="support-footer-glass relative z-10">
        © {new Date().getFullYear()} NÚCLEO DE SUPORTE INTELIGENTE — SISTEMA KABANIA
      </footer>
    </div>
  );
}
