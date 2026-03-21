import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  User, 
  FileText, 
  Mail, 
  AlertCircle,
  Search,
  RotateCcw,
  MessageSquare,
  Link as LinkIcon,
  Share2,
  Timer,
  Flame
} from 'lucide-react';
import { createNotification } from '../services/notificationService';
import { analyzeServiceRequest } from '../services/geminiService';
import './ServiceCenter.css'; 

export default function ServiceCenter({ currentCompany, currentUser }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [aiSuggestions, setAiSuggestions] = useState({});

  const performAiTriage = async (request) => {
    if (aiSuggestions[request.id]) return;
    
    const suggestion = await analyzeServiceRequest(request.description, currentCompany.id);
    if (suggestion) {
      setAiSuggestions(prev => ({ ...prev, [request.id]: suggestion }));
    }
  };

  useEffect(() => {
    if (requests.length > 0) {
      // Trigger AI triage for the first few visible requests to save tokens but provide immediate value
      requests.slice(0, 5).forEach(r => performAiTriage(r));
    }
  }, [requests]);

  const fetchRequests = async (silent = false) => {
    if (!currentCompany?.id) return;
    if (!silent) setLoading(true);
    
    const { data, error } = await supabase
      .from('service_requests')
      .select('*')
      .eq('company_id', currentCompany.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setRequests(data);
    } else if (error) {
      console.error('Error fetching service requests:', error);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchRequests();

    // Realtime subscription for instant updates
    const channel = supabase
      .channel('service_requests_realtime')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'service_requests',
        filter: `company_id=eq.${currentCompany?.id}`
      }, (payload) => {
        console.log('Realtime update received:', payload);
        fetchRequests(true); // Silent update on any change
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentCompany]);

  const handleAccept = async (request) => {
    const newActivityId = String(Math.floor(Math.random() * 90000) + 10000);
    const nowIso = new Date().toISOString();

    const activityPayload = {
      id: newActivityId,
      location: request.customer_name,
      type: request.service_type,
      status: 'Pendente',
      description: request.description,
      observation: `Pedido originado pela Central de Atendimento. Contato: ${request.contact_info || 'Não informado'}`,
      company_id: currentCompany.id,
      created_by: currentUser,
      created: nowIso,
      updated: nowIso
    };

    const { error: activityError } = await supabase.from('activities').insert([activityPayload]);

    if (!activityError) {
      const { error: requestError } = await supabase
        .from('service_requests')
        .update({ status: 'accepted', updated_at: nowIso })
        .eq('id', request.id);

      if (!requestError) {
        setRequests(prev => prev.filter(r => r.id !== request.id));
        createNotification(
          currentCompany.id,
          null,
          'new_activity',
          `✅ Pedido de ${request.customer_name} aceito por ${currentUser.split('@')[0]} e movido para Atividades.`
        );
      }
    } else {
      alert(`Erro ao aceitar pedido: ${activityError.message}`);
    }
  };

  const handleReject = async (request) => {
    if (!window.confirm(`Tem certeza que deseja recusar o chamado de ${request.customer_name}?`)) return;

    const { error } = await supabase
      .from('service_requests')
      .update({ status: 'rejected', updated_at: new Date().toISOString() })
      .eq('id', request.id);

    if (!error) {
      setRequests(prev => prev.filter(r => r.id !== request.id));
    } else {
      alert(`Erro ao recusar pedido: ${error.message}`);
    }
  };

  const handleGenerateMagicLink = async (request) => {
    try {
       // Check if there is already a valid link
       const { data: existing } = await supabase.from('magic_links').select('token').eq('service_request_id', request.id).single();
       
       let tokenStr = existing?.token;

       if (!tokenStr) {
          // Create new link
          tokenStr = crypto.randomUUID();
          
          // Expiration in 7 days
          const expiresAt = new Date();
          expiresAt.setDate(expiresAt.getDate() + 7);

          const { error } = await supabase.from('magic_links').insert([{
             service_request_id: request.id,
             company_id: currentCompany.id,
             token: tokenStr,
             expires_at: expiresAt.toISOString()
          }]);

          if (error) throw error;
       }

       const link = `${window.location.origin}/portal/${tokenStr}`;
       await navigator.clipboard.writeText(link);
       alert("Link do Portal ao Vivo copiado para a área de transferência!\n\nEnvie para o cliente via WhatsApp:\n" + link);

    } catch (err) {
       console.error(err);
       alert("Erro ao gerar link de acompanhamento: " + err.message);
    }
  };

  const filteredRequests = requests.filter(r => 
    r.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.service_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (r.description && r.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const getSlaStatus = (deadlineStr) => {
    if (!deadlineStr) return { color: 'text-slate-400', bg: 'bg-slate-400/10', text: 'SLA Não Definido', icon: <Clock size={12} /> };
    
    const now = new Date();
    const deadline = new Date(deadlineStr);
    const diffMs = deadline - now;
    const diffHours = diffMs / 3600000;

    if (diffHours < 0) {
      return { color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20', text: 'SLA Estourado!', icon: <Flame size={12} /> };
    } else if (diffHours <= 1) {
      return { color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/20 animate-pulse', text: `Restam ${Math.floor(diffMs / 60000)} min`, icon: <Timer size={12} /> };
    } else {
      return { color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20', text: `Expira em ${Math.floor(diffHours)}h`, icon: <Timer size={12} /> };
    }
  };

  return (
    <div className="service-center-container">
      <header className="activity-header">
        <h1 className="activity-title">Central de Atendimento</h1>
        <div className="activity-actions">
          <div className="activity-search-bar">
            <Search size={16} color="#94a3b8" />
            <input
              type="text"
              placeholder="Buscar chamados..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <button className="action-btn-icon" onClick={fetchRequests} title="Atualizar">
            <RotateCcw size={18} />
          </button>
        </div>
      </header>

      <div className="service-grid">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="cp-skeleton-row" style={{ height: '240px', borderRadius: '20px' }} />
          ))
        ) : filteredRequests.length === 0 ? (
          <div className="cp-empty" style={{ gridColumn: '1/-1', textAlign: 'center', padding: '6rem 4rem' }}>
            <Clock size={64} className="mx-auto mb-6 opacity-20" />
            <p className="text-xl font-bold">Nenhum chamado pendente</p>
            <span className="text-sm opacity-50">Novos chamados aparecerão aqui automaticamente.</span>
          </div>
        ) : (
          filteredRequests.map(request => {
            const ai = aiSuggestions[request.id];
            
            return (
              <div key={request.id} className="service-card animate-slide-up">
                <div className="service-card-header">
                  <span className="service-id-badge">Protocolo #{request.id.slice(0, 8)}</span>
                  <div className="service-badges">
                    {ai?.priority === 'Urgente' && <span className="service-badge-urgent">🔥 Urgente</span>}
                    <span className="service-status-pill">Pendente</span>
                  </div>
                </div>
                
                <div className="service-card-main">
                  <h3 className="service-card-title">
                    <User size={18} className="text-accent" /> {request.customer_name}
                  </h3>
                  <div className="service-type-row">
                    <p className="service-card-subtitle">{request.service_type}</p>
                    {ai?.duration && <span className="service-duration-badge"><Clock size={12} /> {ai.duration} min</span>}
                  </div>
                </div>

                <div className="service-description-box">
                  <p>{request.description || 'Sem descrição detalhada.'}</p>
                </div>

                {ai && (
                  <div className="service-ai-triage-box">
                    <div className="ai-triage-header">
                      <Sparkles size={14} className="text-cyan-400" />
                      <span>Sugestão da IA</span>
                    </div>
                    <div className="ai-triage-content">
                      {ai.kb_suggested_tag ? (
                        <span className="ai-tag-pill">🏷️ {ai.kb_suggested_tag}</span>
                      ) : (
                        <span className="ai-tag-pill opacity-50">Sem tag autorizada</span>
                      )}
                      <p className="ai-triage-summary">"{ai.short_summary}"</p>
                    </div>
                  </div>
                )}

                <div className="service-contact-info">
                  <Mail size={14} /> {request.contact_info || 'Sem e-mail'}
                </div>

                <div className="flex items-center justify-between mb-2">
                  <span className="service-card-date">
                    Recebido: {new Date(request.created_at).toLocaleString('pt-BR')}
                  </span>
                  
                  {request.sla_deadline && (
                    <div className={`px-2 py-1 flex items-center gap-1 rounded text-[10px] font-bold uppercase tracking-wider ${getSlaStatus(request.sla_deadline).bg} ${getSlaStatus(request.sla_deadline).color}`}>
                      {getSlaStatus(request.sla_deadline).icon}
                      {getSlaStatus(request.sla_deadline).text}
                    </div>
                  )}
                </div>

                <div className="service-actions">
                  <button 
                    className="btn-service flex-1"
                    style={{ background: 'rgba(56, 189, 248, 0.1)', color: '#38bdf8', border: '1px solid rgba(56, 189, 248, 0.2)' }}
                    onClick={() => handleGenerateMagicLink(request)}
                  >
                    <Share2 size={16} /> Compartilhar Link
                  </button>
                  <button 
                    className="btn-service btn-service-accept"
                    onClick={() => handleAccept(request)}
                  >
                    <CheckCircle size={18} /> Aceitar
                  </button>
                  <button 
                    className="btn-service btn-service-reject"
                    onClick={() => handleReject(request)}
                  >
                    <RotateCcw size={18} style={{ transform: 'rotate(-45deg)' }} /> Recusar
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
