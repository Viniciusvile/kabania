import React, { useState } from 'react';
import { LifeBuoy, Send, Sparkles, User, Mail, MessageSquare, ChevronRight, CheckCircle, AlertCircle, ArrowRight, Loader2, Clock, FileText, ChevronLeft } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { processTaskWithAI } from '../services/geminiService';
import { logEvent } from '../services/historyService';
import './SupportPortal.css';

export default function SupportPortal({ currentUser, currentCompany }) {
  const [step, setStep] = useState(1); // 1: Interactive Form, 2: AI Response, 3: Success
  const [subStep, setSubStep] = useState(1); // 1: Identity, 2: Context, 3: Details
  const [ticketData, setTicketData] = useState({
    name: '',
    email: currentUser || '',
    client: '',
    date: new Date().toISOString().split('T')[0],
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

  const nextSubStep = () => setSubStep(prev => prev + 1);
  const prevSubStep = () => setSubStep(prev => prev - 1);

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!ticketData.subject || !ticketData.description) return;

    setIsLoading(true);
    try {
      const newId = `tk-${Date.now()}`;
      
      const { error } = await supabase.from('support_tickets').insert([{
        id: newId,
        company_id: currentCompany?.id,
        client_name: ticketData.name || 'Cliente Anônimo',
        client_email: ticketData.email,
        client_unit: ticketData.client,
        incident_date: ticketData.date,
        subject: ticketData.subject,
        description: ticketData.description,
        status: 'pending_ai'
      }]);

      if (error) throw error;
      setTicketId(newId);

      const aiSugestion = await processTaskWithAI(
        `CLIENTE/UNIDADE: ${ticketData.client}\nDATA: ${ticketData.date}\nASSUNTO: ${ticketData.subject}\nDESCRIÇÃO: ${ticketData.description}`,
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
        client_unit: ticketData.client,
        incident_date: ticketData.date,
        status: 'pending'
      }]);

      if (error) throw error;

      setStep(3);
      setTicketId(null);
    } catch (err) {
      console.error("Error escalating ticket:", err);
      alert("Erro ao escalar chamado.");
    } finally {
      setIsLoading(false);
    }
  };

  const progressPercentage = step === 1 ? (subStep / 3) * 100 : step === 2 ? 100 : 100;

  return (
    <div className="support-portal-wrapper">
      <div className="support-progress-bar">
        <div className="support-progress-fill" style={{ width: `${progressPercentage}%` }}></div>
      </div>

      <div className="support-panel-card">
        {isLoading && (
            <div className="loading-overlay">
                <Loader2 className="animate-spin text-accent" size={48} />
                <span className="loading-text">Processando com Inteligência Artificial...</span>
            </div>
        )}

        {step === 1 && (
          <div className="support-panel-body conversational-step" key={subStep}>
            {subStep === 1 && (
              <>
                <h2 className="step-title">Olá! Vamos começar com o básico.</h2>
                <p className="step-subtitle">Como devemos identificar você em nosso sistema de atendimento?</p>
                
                <div className="interactive-field-group">
                  <label className="interactive-label">Seu Nome Completo</label>
                  <div className="interactive-input-wrap">
                    <User className="interactive-icon" size={20} />
                    <input 
                      type="text" name="name" value={ticketData.name} onChange={handleInputChange}
                      className="interactive-input" placeholder="Ex: João da Silva" autoFocus
                    />
                  </div>
                </div>

                <div className="interactive-field-group">
                  <label className="interactive-label">E-mail Corporativo</label>
                  <div className="interactive-input-wrap">
                    <Mail className="interactive-icon" size={20} />
                    <input 
                      type="email" name="email" value={ticketData.email} onChange={handleInputChange}
                      className="interactive-input" placeholder="seuemail@empresa.com"
                    />
                  </div>
                </div>

                <div className="nav-actions">
                  <button onClick={nextSubStep} className="btn-interactive btn-next" disabled={!ticketData.name || !ticketData.email}>
                    Continuar <ChevronRight size={18} />
                  </button>
                </div>
              </>
            )}

            {subStep === 2 && (
              <>
                <h2 className="step-title">Onde e quando isso aconteceu?</h2>
                <p className="step-subtitle">Precisamos localizar a unidade afetada para agilizar o suporte.</p>
                
                <div className="interactive-field-group">
                  <label className="interactive-label">Unidade / Cliente</label>
                  <div className="interactive-input-wrap">
                    <LifeBuoy className="interactive-icon" size={20} />
                    <input 
                      type="text" name="client" value={ticketData.client} onChange={handleInputChange}
                      className="interactive-input" placeholder="Identifique a unidade..." autoFocus
                    />
                  </div>
                </div>

                <div className="interactive-field-group">
                  <label className="interactive-label">Data da Ocorrência</label>
                  <div className="interactive-input-wrap">
                    <Clock className="interactive-icon" size={20} />
                    <input 
                      type="date" name="date" value={ticketData.date} onChange={handleInputChange}
                      className="interactive-input"
                    />
                  </div>
                </div>

                <div className="nav-actions">
                  <button onClick={prevSubStep} className="btn-interactive btn-back">
                    Voltar
                  </button>
                  <button onClick={nextSubStep} className="btn-interactive btn-next" disabled={!ticketData.client}>
                    Próximo Passo <ChevronRight size={18} />
                  </button>
                </div>
              </>
            )}

            {subStep === 3 && (
              <>
                <h2 className="step-title">O que está acontecendo?</h2>
                <p className="step-subtitle">Nossa IA analisará seu relato agora mesmo para sugerir uma solução imediata.</p>
                
                <div className="interactive-field-group">
                  <label className="interactive-label">Assunto Principal</label>
                  <div className="interactive-input-wrap">
                    <AlertCircle className="interactive-icon" size={20} />
                    <input 
                      type="text" name="subject" value={ticketData.subject} onChange={handleInputChange}
                      className="interactive-input" placeholder="Resuma em uma frase..." autoFocus
                    />
                  </div>
                </div>

                <div className="interactive-field-group">
                  <label className="interactive-label">Relatório Detalhado</label>
                  <div className="interactive-input-wrap">
                    <FileText className="interactive-icon" style={{ top: '1.5rem' }} size={20} />
                    <textarea 
                      name="description" value={ticketData.description} onChange={handleInputChange}
                      className="interactive-input interactive-textarea" placeholder="Descreva o que aconteceu..."
                    />
                  </div>
                </div>

                <div className="nav-actions">
                  <button onClick={prevSubStep} className="btn-interactive btn-back">
                    Voltar
                  </button>
                  <button onClick={handleSubmit} className="btn-interactive btn-next" disabled={!ticketData.subject || !ticketData.description}>
                    <Send size={18} /> Enviar Chamado
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="support-panel-body conversational-step">
            <h2 className="step-title">IA Triage: Temos uma sugestão!</h2>
            <p className="step-subtitle">Analisei seu relato e esta pode ser a solução rápida:</p>
            
            <div className="ai-suggestion-panel">
              {aiResponse}
            </div>

            <div className="nav-actions" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="text-sm text-muted">Não resolveu? Nossa equipe pode ajudar.</div>
              <div className="flex gap-4">
                <button 
                  onClick={() => setStep(3)}
                  className="btn-interactive bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 px-8"
                >
                  <CheckCircle size={18} /> Funcionou
                </button>
                <button 
                  onClick={handleEscalate}
                  className="btn-interactive btn-next px-8"
                >
                  <ArrowRight size={18} /> Escalar p/ Humano
                </button>
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="support-panel-body text-center conversational-step">
            <div className="success-icon-wrapper mx-auto mb-8" style={{ width: '80px', height: '80px', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CheckCircle size={40} className="text-emerald-500" />
            </div>
            <h2 className="step-title">Tudo certo! Chamado Registrado.</h2>
            <p className="step-subtitle mx-auto max-w-md">
              Sua solicitação foi encaminhada. Você receberá atualizações no seu e-mail corporativo em breve.
            </p>
            <button 
              className="btn-interactive btn-next mx-auto mt-8"
              onClick={() => {
                setStep(1);
                setSubStep(1);
                setTicketData({
                  name: '', email: currentUser || '', client: '', date: new Date().toISOString().split('T')[0],
                  subject: '', description: ''
                });
                setAiResponse('');
              }}
            >
              Abrir Novo Chamado
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
