import React, { useState } from 'react';
import { X, ChevronDown, MapPin, MessageSquare, Phone, Mail, Star, Home, Info, Plus, Sparkles, AlertCircle, ExternalLink, Loader2, Calendar as CalendarIcon } from 'lucide-react';
import { analyzeServiceRequest, checkActivityDuplicates } from '../services/geminiService';
import { supabase } from '../supabaseClient';
import './NewActivityModal.css';

const ACTIVITY_TYPES = [
  'Manutenção Preventiva - 45 minutos',
  'Manutenção Corretiva - 60 minutos',
  'Instalação Field Control - 90 minutos',
  'Instalação de Equipamento - 120 minutos',
  'Vistoria - 30 minutos',
];

const STATUS_OPTIONS = ['Pendente', 'Agendada', 'Concluída', 'Cancelada'];

function formatDateTime(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d)) return dateStr;
  return d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

export default function NewActivityModal({ isOpen, onClose, onSave, currentCompany, existingActivities }) {
  const [activeTab, setActiveTab] = useState('GERAL');
  const [isAnalysing, setIsAnalysing] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState(null);
  const [suggestedKB, setSuggestedKB] = useState(null);

  const getToday = () => new Date().toISOString().slice(0, 10);

  const emptyForm = {
    activityType: '',
    prazo: '',
    client: '',
    location: '',
    address: '',
    contract: '',
    description: '',
    collaborator: '',
    duration: '',
    visitDate: '',
    visitTime: '',
    observation: '',
    status: 'Pendente',
    directToShift: true,
  };

  const [form, setForm] = useState({
    ...emptyForm,
    syncCalendar: localStorage.getItem('kabania_sync_calendar') === 'true',
    directToShift: true
  });

  const [customers, setCustomers] = useState([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [collaborators, setCollaborators] = useState([]);
  const [loadingCollabs, setLoadingCollabs] = useState(false);

  React.useEffect(() => {
    if (isOpen && currentCompany?.id) {
      fetchCustomers();
      fetchCollaborators();
    }
  }, [isOpen, currentCompany?.id]);

  const fetchCustomers = async () => {
    setLoadingCustomers(true);
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('company_id', currentCompany.id)
        .order('name', { ascending: true });
      
      if (!error) {
        setCustomers(data || []);
      }
    } catch (err) {
      console.error("Error fetching customers for modal:", err);
    } finally {
      setLoadingCustomers(false);
    }
  };

  const fetchCollaborators = async () => {
    setLoadingCollabs(true);
    try {
      const { data, error } = await supabase
        .from('collaborators')
        .select('*')
        .eq('company_id', currentCompany.id)
        .order('name', { ascending: true });
      
      if (!error) {
        setCollaborators(data || []);
      }
    } catch (err) {
      console.error("Error fetching collaborators for modal:", err);
    } finally {
      setLoadingCollabs(false);
    }
  };

  if (!isOpen) return null;

  const handleChange = (field) => (e) => {
    const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    if (field === 'syncCalendar') {
      localStorage.setItem('kabania_sync_calendar', val);
    }
    
    // Auto-fill address if customer is selected
    if (field === 'client' && val) {
      const selected = customers.find(c => c.name === val);
      if (selected && selected.address) {
        setForm(prev => ({ ...prev, [field]: val, address: selected.address }));
        return;
      }
    }

    setForm(prev => ({ ...prev, [field]: val }));
    if (field === 'description') {
      handleDuplicateCheck(e.target.value);
    }
  };

  const handleSmartTriage = async () => {
    if (!form.description) {
      console.warn("Smart Triage: Descrição vazia.");
      return;
    }
    
    setIsAnalysing(true);
    console.log("Iniciando Triagem IA para:", form.description);
    
    try {
      const analysis = await analyzeServiceRequest(form.description, currentCompany?.id);
      console.log("Resultado da análise IA:", analysis);
      
      if (analysis && analysis.type) {
        setForm(prev => ({
          ...prev,
          activityType: analysis.type,
          duration: String(analysis.duration || prev.duration),
        }));
        
        if (analysis.kb_suggested_tag) {
          setSuggestedKB(analysis.kb_suggested_tag);
        }
      } else {
        console.error("Análise retornou dados inválidos:", analysis);
        alert("A IA não conseguiu processar esta descrição de forma válida. Tente detalhar melhor o problema.");
      }
    } catch (error) {
      console.error("Erro fatal na Triagem IA:", error);
      alert("Erro ao conectar com o serviço de IA: " + error.message);
    } finally {
      setIsAnalysing(false);
    }
  };

  const handleDuplicateCheck = async (desc) => {
    if (desc.length < 20 || !existingActivities) return;
    const result = await checkActivityDuplicates(desc, existingActivities);
    if (result && result.isDuplicate && result.similarityScore > 70) {
      setDuplicateWarning(result);
    } else {
      setDuplicateWarning(null);
    }
  };

  const handleSave = () => {
    if (!form.client.trim()) {
      alert('Por favor, preencha o campo Cliente.');
      return;
    }
    const now = new Date();
    const created = now.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
    const newActivity = {
      id: String(Math.floor(Math.random() * 90000) + 10000),
      location: form.client || 'Sem cliente',
      type: form.activityType,
      status: form.status,
      rating: 0,
      created,
      updated: created,
      lastAppointment: form.visitDate || null,
      description: form.description,
      observation: form.observation,
      collaborator: form.collaborator,
      address: form.address,
      syncCalendar: form.syncCalendar,
      directToShift: form.directToShift,
    };
    onSave(newActivity);
    setForm(emptyForm);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container animate-slide-up" onClick={e => e.stopPropagation()}>
        <header className="modal-header">
          <div className="header-left">
            <div className="activity-icon-container">
              <span className="activity-icon-shape">D</span>
            </div>
            <h1>Nova atividade</h1>
          </div>
          <button className="close-btn" onClick={onClose}>
            <X size={24} />
          </button>
        </header>

        <nav className="modal-tabs">
          {['GERAL', 'LOCALIZAÇÃO', 'EQUIPAMENTOS'].map(tab => (
            <button
              key={tab}
              className={`tab-item ${activeTab === tab ? 'active' : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </button>
          ))}
        </nav>

        <div className="modal-body">
          {activeTab === 'GERAL' && (
            <div className="tab-content geral-tab">
              {/* Row 1: Activity Type, Prazo, Status */}
              <div className="form-row first-row">
                <div className="form-group flex-2">
                  <label>Tipo de atividade *</label>
                  <div className="select-wrapper">
                    <select
                      className="input-underlined select-native"
                      value={form.activityType}
                      onChange={handleChange('activityType')}
                    >
                      {ACTIVITY_TYPES.map(t => <option key={t}>{t}</option>)}
                    </select>
                    <ChevronDown size={18} className="select-arrow" />
                  </div>
                </div>
                <div className="form-group flex-1">
                  <label>Prazo</label>
                  <input
                    type="date"
                    className="input-underlined"
                    value={form.prazo}
                    onChange={handleChange('prazo')}
                  />
                </div>
                <div className="form-group flex-1">
                  <label>Situação</label>
                  <div className="select-wrapper">
                    <select
                      className="input-underlined select-native"
                      value={form.status}
                      onChange={handleChange('status')}
                    >
                      {STATUS_OPTIONS.map(s => <option key={s}>{s}</option>)}
                    </select>
                    <ChevronDown size={18} className="select-arrow" />
                  </div>
                </div>
              </div>

              {/* Client */}
              <div className="form-group mt-2">
                <label>Cliente *</label>
                <div className="select-wrapper">
                  <select
                    className="input-underlined select-native"
                    value={form.client}
                    onChange={handleChange('client')}
                    disabled={loadingCustomers}
                  >
                    <option value="">Selecione um cliente...</option>
                    {customers.map(c => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                  {loadingCustomers ? (
                    <Loader2 size={16} className="select-arrow animate-spin" />
                  ) : (
                    <ChevronDown size={18} className="select-arrow" />
                  )}
                </div>
              </div>

              {/* Location */}
              <div className="form-group mt-2">
                <label>Localização</label>
                <div className="input-with-actions">
                  <input
                    type="text"
                    className="input-underlined"
                    placeholder="Ex: Centro Administrativo"
                    value={form.location}
                    onChange={handleChange('location')}
                  />
                  {form.location && (
                    <X size={18} className="clear-icon" onClick={() => setForm(p => ({ ...p, location: '' }))} />
                  )}
                </div>
              </div>

              {/* Address */}
              <div className="service-address-box mt-2">
                <div className="address-label">Endereço da ordem de serviço</div>
                <div className="address-content">
                  <MapPin size={18} color="#0052cc" style={{ flexShrink: 0 }} />
                  <input
                    type="text"
                    className="input-underlined"
                    placeholder="Endereço completo..."
                    value={form.address}
                    onChange={handleChange('address')}
                  />
                </div>
              </div>

              {/* Google Calendar Toggle */}
              <div className="calendar-sync-options mt-4">
                <label className="sync-toggle">
                  <input 
                    type="checkbox" 
                    checked={form.syncCalendar} 
                    onChange={handleChange('syncCalendar')} 
                  />
                  <span className="toggle-label">Sincronizar com Google Agenda</span>
                </label>
                {form.syncCalendar && (
                  <div className="sync-note animate-fade-in">
                    <Info size={14} /> 
                    <span>Ative para enviar o prazo direto para o Google Agenda.</span>
                  </div>
                )}
              </div>

              {/* Shift Integration Toggle */}
              <div className="shift-integration-options mt-2">
                <label className="sync-toggle text-accent">
                  <input 
                    type="checkbox" 
                    checked={form.directToShift} 
                    onChange={handleChange('directToShift')} 
                  />
                  <span className="toggle-label font-bold">Direcionar para Escala Operacional</span>
                </label>
                {form.directToShift && (
                  <div className="sync-note animate-fade-in text-accent/80">
                    <CalendarIcon size={14} /> 
                    <span>Esta atividade será agendada automaticamente na grade de escalas.</span>
                  </div>
                )}
              </div>

              {/* Description */}
              <div className="form-group mt-4">
                <div className="label-with-ai">
                  <label>Descrição da ordem de serviço</label>
                  <button 
                    className={`btn-ai-triage ${isAnalysing ? 'analysing' : ''}`}
                    onClick={handleSmartTriage}
                    disabled={isAnalysing || !form.description}
                  >
                    {isAnalysing ? <Loader2 className="animate-spin" size={14} /> : <Sparkles size={14} />}
                    Triagem por IA
                  </button>
                </div>
                <textarea
                  className="textarea-underlined"
                  placeholder="Descreva o serviço a ser realizado..."
                  value={form.description}
                  onChange={handleChange('description')}
                  maxLength={2000}
                  rows={3}
                ></textarea>
                <div className="char-count">{form.description.length} / 2000</div>
              </div>

              {/* AI Insight Banners */}
              {(duplicateWarning || suggestedKB) && (
                <div className="ai-insights-container mt-2">
                  {duplicateWarning && (
                    <div className="ai-insight-banner duplicate-warning">
                      <AlertCircle size={16} />
                      <div className="insight-content">
                        <strong>Possível duplicidade ({duplicateWarning.similarityScore}%)</strong>
                        <span>{duplicateWarning.reason}</span>
                      </div>
                    </div>
                  )}
                  {suggestedKB && (
                    <div className="ai-insight-banner kb-suggestion">
                      <Sparkles size={16} />
                      <div className="insight-content">
                        <strong>Procedimento sugerido: {suggestedKB}</strong>
                        <span>Encontramos um guia na Base de Conhecimento que pode ajudar o técnico.</span>
                      </div>
                      <ExternalLink size={16} className="kb-link-icon" />
                    </div>
                  )}
                </div>
              )}

              {/* Collaborator, Duration, Visit Date, Visit Time */}
              <div className="form-row mt-4">
                <div className="form-group flex-2">
                  <label>Colaborador</label>
                  <div className="select-wrapper">
                    <div className="input-with-icon">
                      <MapPin size={18} color="#22c55e" />
                      <select
                        className="input-underlined select-native"
                        value={form.collaborator}
                        onChange={handleChange('collaborator')}
                        disabled={loadingCollabs}
                      >
                        <option value="">Selecione um colaborador...</option>
                        {collaborators.map(c => (
                          <option key={c.id} value={c.name}>
                            {c.name} {c.specialty ? `— ${c.specialty}` : ''}
                          </option>
                        ))}
                        {collaborators.length === 0 && !loadingCollabs && (
                          <option value="" disabled>Nenhum colaborador cadastrado</option>
                        )}
                      </select>
                    </div>
                    {loadingCollabs ? (
                      <Loader2 size={16} className="select-arrow animate-spin" />
                    ) : (
                      <ChevronDown size={18} className="select-arrow" />
                    )}
                  </div>
                </div>
                <div className="form-group flex-1">
                  <label>Duração (min) *</label>
                  <input
                    type="number"
                    className="input-underlined"
                    min={1}
                    value={form.duration}
                    onChange={handleChange('duration')}
                  />
                </div>
                <div className="form-group flex-1">
                  <label>Data visita</label>
                  <input
                    type="date"
                    className="input-underlined"
                    value={form.visitDate}
                    onChange={handleChange('visitDate')}
                  />
                </div>
                <div className="form-group flex-1">
                  <label>Horário visita</label>
                  <input
                    type="time"
                    className="input-underlined"
                    value={form.visitTime}
                    onChange={handleChange('visitTime')}
                  />
                </div>
              </div>

              {/* Observation */}
              <div className="form-group mt-4">
                <label>Observação da visita</label>
                <textarea
                  className="textarea-underlined"
                  placeholder="Observações adicionais..."
                  value={form.observation}
                  onChange={handleChange('observation')}
                  maxLength={2000}
                  rows={2}
                ></textarea>
                <div className="char-count">{form.observation.length} / 2000</div>
              </div>

              <div className="modal-actions-center mt-4">
                <button className="btn-outline">
                  <Plus size={14} /> ADICIONAR MAIS UMA VISITA
                </button>
              </div>
            </div>
          )}

          {activeTab === 'LOCALIZAÇÃO' && (
            <div className="tab-content placeholder-tab">
              <MapPin size={48} color="#94a3b8" />
              <p>Aba de Localização em desenvolvimento</p>
            </div>
          )}

          {activeTab === 'EQUIPAMENTOS' && (
            <div className="tab-content placeholder-tab">
              <p>Aba de Equipamentos em desenvolvimento</p>
            </div>
          )}
        </div>

        <footer className="modal-footer">
          <button className="btn-cancel-modal" onClick={onClose}>CANCELAR</button>
          <button className="btn-create" onClick={handleSave}>CRIAR</button>
        </footer>
      </div>
    </div>
  );
}
