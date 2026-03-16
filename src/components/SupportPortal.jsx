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
        <h1 className="account-title">
          <LifeBuoy size={28} className="text-accent" /> Central de Atendimento
        </h1>
        <p className="account-subtitle">Abra um chamado e receba ajuda imediata da nossa Inteligência Artificial.</p>
      </header>

      <div className="account-card max-w-3xl mx-auto overflow-hidden">
        {step === 1 ? (
          <form onSubmit={handleSubmit} className="p-8">
            <div className="flex items-center gap-3 mb-8 pb-4 border-b border-white/5">
              <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center text-accent">
                <MessageSquare size={20} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Novo Chamado</h2>
                <p className="text-sm text-muted">Preencha os dados abaixo para começar.</p>
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
                    className="form-input"
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
                    className="form-input"
                    placeholder="seu@email.com"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="form-group mb-6">
              <label className="form-label">Assunto</label>
              <div className="form-input-wrapper">
                <AlertCircle className="form-icon" size={16} />
                <input 
                  type="text" 
                  name="subject"
                  value={ticketData.subject}
                  onChange={handleInputChange}
                  className="form-input"
                  placeholder="Resuma o seu problema"
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
                className="form-textarea min-h-[150px]"
                placeholder="Conte-nos o que está acontecendo..."
                required
              />
            </div>

            <button 
              type="submit" 
              className="btn-premium btn-premium-primary w-full py-4 text-lg font-bold"
              disabled={isLoading}
            >
              {isLoading ? (
                <><Loader2 className="animate-spin" size={20} /> Analisando...</>
              ) : (
                <><Send size={20} /> Enviar Chamado</>
              )}
            </button>
          </form>
        ) : (
          <div className="p-0">
            <div className="bg-accent/5 p-8 border-b border-white/5">
              <div className="flex items-center gap-2 text-accent mb-4 font-bold text-sm uppercase tracking-wider">
                <Sparkles size={16} /> Sugestão da IA Instante
              </div>
              <div className="bg-white/5 rounded-2xl p-6 border border-white/10 text-white leading-relaxed text-lg">
                {aiResponse}
              </div>
            </div>

            <div className="p-8">
              <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="text-muted text-sm max-w-md">
                  A solução acima resolveu o seu problema? Se sim, você pode encerrar o chamado agora.
                </div>
                <div className="flex gap-3 w-full md:w-auto">
                  <button 
                    onClick={() => {
                        setStep(1);
                        setTicketData({name:'', email: currentUser||'', subject: '', description: ''});
                    }}
                    className="btn-premium border-green-500/30 text-green-400 hover:bg-green-500/10 flex-1 md:flex-initial"
                  >
                    <CheckCircle size={18} /> Resolvido
                  </button>
                  <button 
                    onClick={handleEscalate}
                    className="btn-premium btn-premium-primary flex-1 md:flex-initial"
                    disabled={isLoading}
                  >
                    {isLoading ? <Loader2 className="animate-spin" size={18} /> : <><ArrowRight size={18} /> Falar com Atendente</>}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <footer className="mt-8 text-center text-muted text-xs">
        © {new Date().getFullYear()} Suporte Inteligente — Sistema integrado à Base de Conhecimento Corporativa.
      </footer>
    </div>
  );
}
