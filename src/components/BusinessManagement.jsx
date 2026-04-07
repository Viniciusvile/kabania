import React, { useState, useEffect } from 'react';
import { History, Download, FileSpreadsheet, FileJson, Clock, User, Activity, ShieldAlert, CheckCircle2, XCircle, Trash2 } from 'lucide-react';
import { getHistory, logEvent } from '../services/historyService';
import { supabase } from '../supabaseClient';
import './BusinessManagement.css';

export default function BusinessManagement({ currentUser, currentCompany, userRole, initialTab = 'history' }) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [history, setHistory] = useState([]);
  const [activities, setActivities] = useState([]);
  const [filter, setFilter] = useState('ALL');

  useEffect(() => {
    const loadData = async () => {
      if (!currentCompany?.id) return;
      
      const historyData = await getHistory(currentCompany.id);
      setHistory(Array.isArray(historyData) ? historyData : []);
      
      const { data: companyActivities, error } = await supabase
        .from('activities')
        .select('*')
        .eq('company_id', currentCompany.id);
        
      if (!error && companyActivities) {
        setActivities(companyActivities);
      }
    };
    
    loadData();
  }, [currentCompany]);

  const filteredHistory = (history || []).filter(event => {
    if (!event || !event.action) return false;
    if (filter === 'ALL') return true;
    if (filter === 'ACTIVITY') return event.action.includes('ACTIVITY');
    if (filter === 'MEMBER') return event.action.includes('MEMBER');
    return true;
  });

  const formatDate = (isoStr) => {
    const d = new Date(isoStr);
    return d.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getActionIcon = (action) => {
    if (action.includes('CREATE')) return <Activity size={16} className="text-cyan-500" />;
    if (action.includes('DELETE')) return <Trash2 size={16} className="text-red-500" />;
    if (action.includes('ROLE')) return <ShieldAlert size={16} className="text-yellow-500" />;
    if (action.includes('MEMBER')) return <User size={16} className="text-purple-500" />;
    return <Clock size={16} className="text-slate-400" />;
  };

  const handleExportCSV = (type) => {
    let data = [];
    let filename = '';
    
    if (type === 'activities') {
      data = activities;
      filename = `atividades_${currentCompany.name.toLowerCase().replace(/\s/g, '_')}.csv`;
    } else {
      data = history;
      filename = `historico_${currentCompany.name.toLowerCase().replace(/\s/g, '_')}.csv`;
    }

    if (data.length === 0) {
      alert('Nenhum dado para exportar.');
      return;
    }

    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(obj => Object.values(obj).join(',')).join('\n');
    const csvContent = "data:text/csv;charset=utf-8," + headers + "\n" + rows;
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    logEvent(currentCompany.id, currentUser, 'EXPORT_DATA', `Exportação de ${type} realizada.`);
  };

  return (
    <div className="business-mgmt animate-fade-in">
      <header className="bm-header">
        <div className="bm-header-info">
          <h1>Gestão Empresarial</h1>
          <p>Administração centralizada, auditoria e relatórios da {currentCompany?.name}</p>
        </div>
        <div className="bm-tabs">
          <button 
            className={`bm-tab ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => setActiveTab('history')}
          >
            <History size={18} /> Histórico de Atividades
          </button>
          <button 
            className={`bm-tab ${activeTab === 'export' ? 'active' : ''}`}
            onClick={() => setActiveTab('export')}
          >
            <Download size={18} /> Exportar Relatórios
          </button>
        </div>
      </header>

      <div className="bm-content">
        {activeTab === 'history' ? (
          <div className="bm-history-view">
            <div className="bm-filters">
              <button className={filter === 'ALL' ? 'active' : ''} onClick={() => setFilter('ALL')}>Todos</button>
              <button className={filter === 'ACTIVITY' ? 'active' : ''} onClick={() => setFilter('ACTIVITY')}>Atividades</button>
              <button className={filter === 'MEMBER' ? 'active' : ''} onClick={() => setFilter('MEMBER')}>Membros</button>
            </div>

            <div className="bm-timeline">
              {filteredHistory.length === 0 ? (
                <div className="bm-empty">Nenhum evento registrado ainda.</div>
              ) : (
                filteredHistory.map(event => (
                  <div key={event.id} className="bm-timeline-item">
                    <div className="bm-timeline-icon">
                      {getActionIcon(event.action)}
                    </div>
                    <div className="bm-timeline-content">
                      <div className="bm-timeline-header">
                        <span className="bm-event-user"><User size={12} /> {event.userEmail}</span>
                        <span className="bm-event-date">{formatDate(event.timestamp)}</span>
                      </div>
                      <p className="bm-event-details">{event.details}</p>
                      <span className="bm-event-tag">{event.action}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ) : (
          <div className="bm-export-view">
            <div className="bm-export-grid">
              <div className="bm-export-card">
                <div className="bm-export-icon bg-cyan-soft">
                  <Activity size={32} />
                </div>
                <h3>Lista de Atividades</h3>
                <p>Relatório completo de todas as solicitações de serviço ativas e arquivadas.</p>
                <div className="bm-export-actions">
                  <button className="bm-btn-export prim" onClick={() => handleExportCSV('activities')}>
                    <FileSpreadsheet size={18} /> Exportar Excel (CSV)
                  </button>
                  <button className="bm-btn-export sec" onClick={() => window.print()}>
                    <Download size={18} /> Gerar PDF (Imprimir)
                  </button>
                </div>
              </div>

              <div className="bm-export-card">
                <div className="bm-export-icon bg-purple-soft">
                  <History size={32} />
                </div>
                <h3>Log de Auditoria</h3>
                <p>Histórico completo de ações administrativas e alterações no sistema.</p>
                <div className="bm-export-actions">
                  <button className="bm-btn-export prim" onClick={() => handleExportCSV('history')}>
                    <FileSpreadsheet size={18} /> Exportar Excel (CSV)
                  </button>
                  <button className="bm-btn-export sec" onClick={() => window.print()}>
                    <Download size={18} /> Gerar PDF (Imprimir)
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Hidden printable report layout */}
      <div className="printable-report">
        <div className="print-header">
          <h1>Relatório de Atividades - {currentCompany?.name}</h1>
          <p>Gerado em: {new Date().toLocaleString('pt-BR')}</p>
        </div>
        <table className="print-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Localização</th>
              <th>Tipo</th>
              <th>Situação</th>
              <th>Data</th>
            </tr>
          </thead>
          <tbody>
            {(activities || []).map(a => (
              <tr key={a.id}>
                <td>{a.id}</td>
                <td>{a.location}</td>
                <td>{a.type}</td>
                <td>{a.status}</td>
                <td>{a.created}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="print-footer">
          <p>Synapse Smart Gestão Empresarial</p>
        </div>
      </div>
    </div>
  );
}
