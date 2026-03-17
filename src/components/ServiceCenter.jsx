import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  User, 
  FileText, 
  Phone, 
  AlertCircle,
  Search,
  RotateCcw
} from 'lucide-react';
import { createNotification } from '../services/notificationService';
import './ActivityList.css'; // Reusing some styles for consistency

export default function ServiceCenter({ currentCompany, currentUser }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchRequests = async () => {
    if (!currentCompany?.id) return;
    setLoading(true);
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
  }, [currentCompany]);

  const handleAccept = async (request) => {
    const newActivityId = String(Math.floor(Math.random() * 90000) + 10000);
    const nowIso = new Date().toISOString();

    // 1. Create activity from request
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
      // 2. Update request status to 'accepted'
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

  const filteredRequests = requests.filter(r => 
    r.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.service_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (r.description && r.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="activity-list-container animate-fade-in">
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

      <div className="activity-content-wrapper">
        <div className="activity-grid-view">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="cp-skeleton-row" style={{ height: '200px' }} />
            ))
          ) : filteredRequests.length === 0 ? (
            <div className="cp-empty" style={{ gridColumn: '1/-1', textAlign: 'center', padding: '4rem' }}>
              <Clock size={48} className="mx-auto mb-4 opacity-20" />
              <p>Nenhum chamado pendente no momento.</p>
              <span className="text-xs opacity-50">Novos chamados aparecerão aqui automaticamente.</span>
            </div>
          ) : (
            filteredRequests.map(request => (
              <div key={request.id} className="activity-card animate-slide-up">
                <div className="activity-card-header">
                  <span className="activity-card-id">Chamado</span>
                  <span className="status-badge status-pendente">Aguardando</span>
                </div>
                <div className="activity-card-body">
                  <h3 className="activity-card-title flex items-center gap-2">
                    <User size={16} className="text-accent" /> {request.customer_name}
                  </h3>
                  <p className="activity-card-type">{request.service_type}</p>
                  <div className="mt-2 text-sm opacity-80 line-clamp-2">
                    <FileText size={14} className="inline mr-1" /> {request.description || 'Sem descrição'}
                  </div>
                  {request.contact_info && (
                    <div className="mt-1 text-xs opacity-60">
                      <Phone size={12} className="inline mr-1" /> {request.contact_info}
                    </div>
                  )}
                  <div className="activity-card-date mt-3">
                    <span>Recebido em: {new Date(request.created_at).toLocaleString('pt-BR')}</span>
                  </div>
                </div>
                <div className="activity-card-footer" style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1rem', marginTop: '1rem' }}>
                  <div className="flex gap-2 w-full">
                    <button 
                      className="flex-1 bg-green-500/10 hover:bg-green-500/20 text-green-400 py-2 rounded-lg text-sm font-semibold transition-all border border-green-500/20 flex items-center justify-center gap-2"
                      onClick={() => handleAccept(request)}
                    >
                      <CheckCircle size={16} /> Aceitar
                    </button>
                    <button 
                      className="flex-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 py-2 rounded-lg text-sm font-semibold transition-all border border-red-500/20 flex items-center justify-center gap-2"
                      onClick={() => handleReject(request)}
                    >
                      <XCircle size={16} /> Recusar
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
