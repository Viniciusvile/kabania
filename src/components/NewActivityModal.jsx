import { useState, useEffect, useRef, useCallback } from 'react';
import { X, ChevronDown, MapPin, Sparkles, AlertCircle, ExternalLink, Loader2, Calendar as CalendarIcon, Info } from 'lucide-react';
import { analyzeServiceRequest, checkActivityDuplicates } from '../services/geminiService';
import { supabase } from '../supabaseClient';
import './NewActivityModal.css';

const ACTIVITY_TYPES = [
  { label: 'Manutenção Preventiva', duration: 45 },
  { label: 'Manutenção Corretiva',  duration: 60 },
  { label: 'Instalação de Equipamento', duration: 120 },
  { label: 'Vistoria', duration: 30 },
];

const STATUS_OPTIONS = ['Pendente', 'Agendada', 'Concluída', 'Cancelada'];

// Outside component — never recreated on render
const EMPTY_FORM = {
  activityType: ACTIVITY_TYPES[0].label,
  prazo: '',
  client: '',
  location: '',
  address: '',
  description: '',
  collaborator: '',
  duration: String(ACTIVITY_TYPES[0].duration),
  visitDate: '',
  visitTime: '',
  observation: '',
  status: 'Pendente',
  directToShift: true,
};

// Debounce helper
function useDebounce(fn, delay) {
  const timer = useRef(null);
  return useCallback((...args) => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => fn(...args), delay);
  }, [fn, delay]);
}

// Required fields for progress bar
const REQUIRED_FIELDS = ['activityType', 'client'];
const OPTIONAL_SCORED = ['description', 'collaborator', 'visitDate', 'address'];

function calcProgress(form) {
  const req = REQUIRED_FIELDS.filter(f => form[f]?.trim()).length;
  const opt = OPTIONAL_SCORED.filter(f => form[f]?.trim()).length;
  return Math.round(((req * 2 + opt) / (REQUIRED_FIELDS.length * 2 + OPTIONAL_SCORED.length)) * 100);
}

export default function NewActivityModal({ isOpen, onClose, onSave, currentCompany, existingActivities }) {
  const [activeTab, setActiveTab] = useState('GERAL');
  const [isAnalysing, setIsAnalysing] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState(null);
  const [suggestedKB, setSuggestedKB] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [collaborators, setCollaborators] = useState([]);
  const [loadingCollabs, setLoadingCollabs] = useState(false);
  const [syncCalendar, setSyncCalendar] = useState(() => localStorage.getItem('kabania_sync_calendar') === 'true');
  const [form, setForm] = useState(EMPTY_FORM);

  // Parallel fetch on open
  useEffect(() => {
    if (!isOpen || !currentCompany?.id) return;
    setLoadingCustomers(true);
    setLoadingCollabs(true);

    Promise.all([
      supabase.from('customers').select('id,name,address').eq('company_id', currentCompany.id).order('name'),
      supabase.from('collaborators').select('id,name,specialty').eq('company_id', currentCompany.id).order('name'),
    ]).then(([custRes, collabRes]) => {
      setCustomers(custRes.data || []);
      setCollaborators(collabRes.data || []);
    }).catch(console.error).finally(() => {
      setLoadingCustomers(false);
      setLoadingCollabs(false);
    });
  }, [isOpen, currentCompany?.id]);

  // Debounced duplicate check — fires 500ms after user stops typing
  const runDuplicateCheck = useCallback(async (desc) => {
    if (desc.length < 20 || !existingActivities) return;
    const result = await checkActivityDuplicates(desc, existingActivities);
    if (result?.isDuplicate && result.similarityScore > 70) {
      setDuplicateWarning(result);
    } else {
      setDuplicateWarning(null);
    }
  }, [existingActivities]);

  const debouncedDuplicateCheck = useDebounce(runDuplicateCheck, 500);

  if (!isOpen) return null;

  const progress = calcProgress(form);

  const handleChange = (field) => (e) => {
    const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value;

    if (field === 'activityType') {
      // Auto-fill duration when type changes
      const match = ACTIVITY_TYPES.find(t => t.label === val);
      setForm(prev => ({ ...prev, activityType: val, duration: match ? String(match.duration) : prev.duration }));
      return;
    }

    if (field === 'client') {
      const selected = customers.find(c => c.name === val);
      setForm(prev => ({ ...prev, client: val, address: selected?.address || prev.address }));
      return;
    }

    if (field === 'description') {
      setForm(prev => ({ ...prev, description: val }));
      debouncedDuplicateCheck(val);
      return;
    }

    setForm(prev => ({ ...prev, [field]: val }));
  };

  const handleSmartTriage = async () => {
    if (!form.description || isAnalysing) return;
    setIsAnalysing(true);
    try {
      const analysis = await analyzeServiceRequest(form.description, currentCompany?.id);
      if (analysis?.type) {
        const match = ACTIVITY_TYPES.find(t => t.label === analysis.type || analysis.type.startsWith(t.label));
        setForm(prev => ({
          ...prev,
          activityType: analysis.type,
          duration: match ? String(match.duration) : String(analysis.duration || prev.duration),
        }));
        if (analysis.kb_suggested_tag) setSuggestedKB(analysis.kb_suggested_tag);
      }
    } catch (err) {
      console.error('[SmartTriage]', err);
    } finally {
      setIsAnalysing(false);
    }
  };

  const handleSave = () => {
    if (!form.client.trim()) {
      alert('Selecione um cliente antes de continuar.');
      return;
    }
    const now = new Date().toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
    onSave({
      id: crypto.randomUUID(),
      location: form.client,
      type: form.activityType,
      status: form.status,
      rating: 0,
      created: now,
      updated: now,
      lastAppointment: form.visitDate || null,
      description: form.description,
      observation: form.observation,
      collaborator: form.collaborator,
      address: form.address,
      syncCalendar,
      directToShift: form.directToShift,
    });
    setForm(EMPTY_FORM);
    setDuplicateWarning(null);
    setSuggestedKB(null);
    onClose();
  };

  const progressColor = progress < 40 ? '#f87171' : progress < 75 ? '#fbbf24' : '#34d399';

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container animate-slide-up" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <header className="modal-header">
          <div className="header-left">
            <div className="activity-icon-container">
              <span className="activity-icon-shape">D</span>
            </div>
            <div>
              <h1>Nova atividade</h1>
              <p className="modal-subtitle">{currentCompany?.name || 'Ordem de Serviço'}</p>
            </div>
          </div>
          <div className="header-right">
            <div className="progress-ring" title={`${progress}% preenchido`}>
              <svg viewBox="0 0 36 36" width="36" height="36">
                <circle cx="18" cy="18" r="15" fill="none" stroke="var(--border-color)" strokeWidth="3" />
                <circle
                  cx="18" cy="18" r="15" fill="none"
                  stroke={progressColor}
                  strokeWidth="3"
                  strokeDasharray={`${progress * 0.942} 94.2`}
                  strokeLinecap="round"
                  transform="rotate(-90 18 18)"
                  style={{ transition: 'stroke-dasharray 0.4s ease' }}
                />
                <text x="18" y="22" textAnchor="middle" fontSize="9" fontWeight="700" fill={progressColor}>{progress}%</text>
              </svg>
            </div>
            <button className="close-btn" onClick={onClose}><X size={20} /></button>
          </div>
        </header>

        {/* Tabs */}
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

        {/* Body */}
        <div className="modal-body">
          {activeTab === 'GERAL' && (
            <div className="tab-content geral-tab">

              {/* Row 1: Type + Status */}
              <div className="form-row">
                <div className="form-group flex-2">
                  <label>Tipo de atividade *</label>
                  <div className="select-wrapper">
                    <select className="input-underlined select-native" value={form.activityType} onChange={handleChange('activityType')}>
                      {ACTIVITY_TYPES.map(t => <option key={t.label} value={t.label}>{t.label}</option>)}
                    </select>
                    <ChevronDown size={16} className="select-arrow" />
                  </div>
                </div>
                <div className="form-group flex-1">
                  <label>Situação</label>
                  <div className="select-wrapper">
                    <select className="input-underlined select-native" value={form.status} onChange={handleChange('status')}>
                      {STATUS_OPTIONS.map(s => <option key={s}>{s}</option>)}
                    </select>
                    <ChevronDown size={16} className="select-arrow" />
                  </div>
                </div>
                <div className="form-group" style={{ minWidth: 110 }}>
                  <label>Duração (min)</label>
                  <input type="number" className="input-underlined" min={1} value={form.duration} onChange={handleChange('duration')} />
                </div>
              </div>

              {/* Row 2: Client + Prazo */}
              <div className="form-row">
                <div className="form-group flex-2">
                  <label>Cliente *</label>
                  <div className="select-wrapper">
                    <select className="input-underlined select-native" value={form.client} onChange={handleChange('client')} disabled={loadingCustomers}>
                      <option value="">Selecione um cliente...</option>
                      {customers.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                    </select>
                    {loadingCustomers
                      ? <Loader2 size={14} className="select-arrow animate-spin" />
                      : <ChevronDown size={16} className="select-arrow" />}
                  </div>
                </div>
                <div className="form-group flex-1">
                  <label>Prazo</label>
                  <input type="date" className="input-underlined" value={form.prazo} onChange={handleChange('prazo')} />
                </div>
              </div>

              {/* Address */}
              <div className="service-address-box">
                <div className="address-label">Endereço da ordem de serviço</div>
                <div className="address-content">
                  <MapPin size={16} color="#0052cc" style={{ flexShrink: 0 }} />
                  <input type="text" className="input-underlined" placeholder="Preenchido automaticamente ou insira manualmente..." value={form.address} onChange={handleChange('address')} />
                </div>
              </div>

              {/* Collaborator + Visit Date + Time */}
              <div className="form-row">
                <div className="form-group flex-2">
                  <label>Colaborador</label>
                  <div className="select-wrapper">
                    <select className="input-underlined select-native" value={form.collaborator} onChange={handleChange('collaborator')} disabled={loadingCollabs}>
                      <option value="">Selecione...</option>
                      {collaborators.map(c => (
                        <option key={c.id} value={c.name}>{c.name}{c.specialty ? ` — ${c.specialty}` : ''}</option>
                      ))}
                    </select>
                    {loadingCollabs
                      ? <Loader2 size={14} className="select-arrow animate-spin" />
                      : <ChevronDown size={16} className="select-arrow" />}
                  </div>
                </div>
                <div className="form-group flex-1">
                  <label>Data da visita</label>
                  <input type="date" className="input-underlined" value={form.visitDate} onChange={handleChange('visitDate')} />
                </div>
                <div className="form-group flex-1">
                  <label>Horário</label>
                  <input type="time" className="input-underlined" value={form.visitTime} onChange={handleChange('visitTime')} />
                </div>
              </div>

              {/* Description with AI Triage */}
              <div className="form-group">
                <div className="label-with-ai">
                  <label>Descrição da ordem de serviço</label>
                  <button
                    className={`btn-ai-triage ${isAnalysing ? 'analysing' : ''}`}
                    onClick={handleSmartTriage}
                    disabled={isAnalysing || !form.description}
                    title="Analisar descrição com IA e preencher campos automaticamente"
                  >
                    {isAnalysing ? <Loader2 className="animate-spin" size={13} /> : <Sparkles size={13} />}
                    {isAnalysing ? 'Analisando...' : 'Triagem IA'}
                  </button>
                </div>
                <textarea
                  className="textarea-underlined"
                  placeholder="Descreva o serviço. Use 'Triagem IA' para preencher campos automaticamente."
                  value={form.description}
                  onChange={handleChange('description')}
                  maxLength={2000}
                  rows={3}
                />
                <div className="char-count">{form.description.length} / 2000</div>
              </div>

              {/* AI Insight Banners */}
              {(duplicateWarning || suggestedKB) && (
                <div className="ai-insights-container">
                  {duplicateWarning && (
                    <div className="ai-insight-banner duplicate-warning">
                      <AlertCircle size={15} />
                      <div className="insight-content">
                        <strong>Possível duplicidade ({duplicateWarning.similarityScore}%)</strong>
                        <span>{duplicateWarning.reason}</span>
                      </div>
                    </div>
                  )}
                  {suggestedKB && (
                    <div className="ai-insight-banner kb-suggestion">
                      <Sparkles size={15} />
                      <div className="insight-content">
                        <strong>Procedimento sugerido: {suggestedKB}</strong>
                        <span>Encontramos um guia na Base de Conhecimento.</span>
                      </div>
                      <ExternalLink size={14} className="kb-link-icon" />
                    </div>
                  )}
                </div>
              )}

              {/* Observation */}
              <div className="form-group">
                <label>Observação</label>
                <textarea
                  className="textarea-underlined"
                  placeholder="Observações adicionais para o técnico..."
                  value={form.observation}
                  onChange={handleChange('observation')}
                  maxLength={500}
                  rows={2}
                />
                <div className="char-count">{form.observation.length} / 500</div>
              </div>

              {/* Compact Toggles — side by side */}
              <div className="toggles-row">
                <label className="toggle-chip">
                  <input type="checkbox" checked={syncCalendar} onChange={e => { setSyncCalendar(e.target.checked); localStorage.setItem('kabania_sync_calendar', e.target.checked); }} />
                  <CalendarIcon size={14} />
                  <span>Google Agenda</span>
                </label>
                <label className="toggle-chip toggle-chip-green">
                  <input type="checkbox" checked={form.directToShift} onChange={handleChange('directToShift')} />
                  <CalendarIcon size={14} />
                  <span>Direcionar para Escala</span>
                </label>
              </div>

            </div>
          )}

          {activeTab === 'LOCALIZAÇÃO' && (
            <div className="tab-content placeholder-tab">
              <MapPin size={40} strokeWidth={1} />
              <p>Aba de Localização em desenvolvimento</p>
            </div>
          )}

          {activeTab === 'EQUIPAMENTOS' && (
            <div className="tab-content placeholder-tab">
              <Info size={40} strokeWidth={1} />
              <p>Aba de Equipamentos em desenvolvimento</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <footer className="modal-footer">
          <div className="footer-hint">
            {!form.client && <span><AlertCircle size={13} /> Cliente obrigatório</span>}
          </div>
          <div className="footer-actions">
            <button className="btn-cancel-modal" onClick={onClose}>Cancelar</button>
            <button className="btn-create" onClick={handleSave} disabled={!form.client}>
              Criar Atividade
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
