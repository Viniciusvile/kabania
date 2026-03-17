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

      const { error } = await supabase.from('service_requests').insert([{
        company_id: currentCompany?.id,
        customer_name: ticketData.name || 'Cliente Anônimo',
        service_type: ticketData.subject,
        description: ticketData.description,
        contact_info: ticketData.email,
        status: 'pending'
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
    <div className="support-portal-wrapper">
      <header className="support-header-area">
        <div className="support-title-row">
          <h1 className="support-title">Central de Atendimento</h1>
        </div>
        <div className="support-breadcrumbs">
          <span>Gestão de Projetos</span>
          <ChevronRight size={14} className="text-dark" />
          <span className="text-accent">Suporte ao Cliente</span>
        </div>
      </header>

      <div className="support-panel-card support-form-animate">
        {step === 1 ? (
          <>
            <div className="support-panel-header">
              <div className="support-panel-header-title">
                <MessageSquare size={20} className="text-accent" />
                <span>Abrir Novo Chamado</span>
              </div>
              <div className="ai-badge">
                <Sparkles size={12} /> IA Triage Ativo
              </div>
            </div>

            <form onSubmit={handleSubmit} className="support-panel-body">
              <div className="support-form-grid">
                <div className="support-field-group">
                  <label className="support-field-label">Seu Nome</label>
                  <div className="support-input-container">
                    <User className="support-input-icon" size={16} />
                    <input 
                      type="text" 
                      name="name"
                      value={ticketData.name}
                      onChange={handleInputChange}
                      className="support-input"
                      placeholder="Como devemos te chamar?"
                      required
                    />
                  </div>
                </div>
                <div className="support-field-group">
                  <label className="support-field-label">E-mail de Contato</label>
                  <div className="support-input-container">
                    <Mail className="support-input-icon" size={16} />
                    <input 
                      type="email" 
                      name="email"
                      value={ticketData.email}
                      onChange={handleInputChange}
                      className="support-input"
                      placeholder="seu@email.com"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="support-field-group">
                <label className="support-field-label">Assunto do Chamado</label>
                <div className="support-input-container">
                  <AlertCircle className="support-input-icon" size={16} />
                  <input 
                    type="text" 
                    name="subject"
                    value={ticketData.subject}
                    onChange={handleInputChange}
                    className="support-input"
                    placeholder="Ex: Problema no acesso aos módulos"
                    required
                  />
                </div>
              </div>

              <div className="support-field-group">
                <label className="support-field-label">Descrição Detalhada</label>
                <div className="support-input-container">
                  <MessageSquare className="support-input-icon" style={{ top: '1.2rem', transform: 'none' }} size={16} />
                  <textarea 
                    name="description"
                    value={ticketData.description}
                    onChange={handleInputChange}
                    className="support-input support-textarea"
                    placeholder="Descreva o problema de forma detalhada para uma melhor resposta da IA..."
                    required
                  />
                </div>
              </div>

              <div className="mt-8">
                <button 
                  type="submit" 
                  className="btn-premium btn-premium-primary w-full py-4 text-lg font-bold"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <><Loader2 className="animate-spin" size={20} /> Processando Chamado...</>
                  ) : (
                    <><Send size={20} /> Enviar Chamado</>
                  )}
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="support-form-animate">
            <div className="support-panel-header">
              <div className="support-panel-header-title">
                <Sparkles size={20} className="text-accent" />
                <span>Sugestão da Inteligência Artificial</span>
              </div>
              <div className="text-xs text-muted">ID: {ticketId}</div>
            </div>

            <div className="support-panel-body">
              <div className="ai-suggestion-panel">
                {aiResponse}
              </div>

              <div className="support-actions-footer">
                <div className="support-footer-info">
                  <h4>A solução funcionou?</h4>
                  <p>Caso contrário, nossa equipe técnica cuidará do seu caso.</p>
                </div>
                <div className="flex gap-4">
                  <button 
                    onClick={() => {
                        setStep(1);
                        setTicketData({name:'', email: currentUser||'', subject: '', description: ''});
                    }}
                    className="btn-premium bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 hover:bg-emerald-500/20 transition-all font-bold px-8"
                  >
                    <CheckCircle size={18} /> Resolvido
                  </button>
                  <button 
                    onClick={handleEscalate}
                    className="btn-premium btn-premium-primary px-8"
                    disabled={isLoading}
                  >
                    {isLoading ? <Loader2 className="animate-spin" size={18} /> : <><ArrowRight size={18} /> Escalar p/ Equipe</>}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
