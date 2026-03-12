import React, { useState } from 'react';
import { X, ChevronDown, MapPin, MessageSquare, Phone, Mail, Star, Home, Info, Plus } from 'lucide-react';
import './NewActivityModal.css';

const ACTIVITY_TYPES = [
  'Manutenção Preventiva - 45 minutos',
  'Manutenção Corretiva - 60 minutos',
  'Instalação Field Control - 90 minutos',
  'Instalação de Equipamento - 120 minutos',
  'Vistoria - 30 minutos',
];

const COLLABORATORS = [
  'Miguel Moraes - 1km de distância',
  'Ana Paula - 3km de distância',
  'Carlos Lima - 5km de distância',
];

const STATUS_OPTIONS = ['Pendente', 'Agendada', 'Concluída', 'Cancelada'];

function formatDateTime(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d)) return dateStr;
  return d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

export default function NewActivityModal({ isOpen, onClose, onSave }) {
  const [activeTab, setActiveTab] = useState('GERAL');

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
  };

  const [form, setForm] = useState(emptyForm);

  if (!isOpen) return null;

  const handleChange = (field) => (e) => {
    setForm(prev => ({ ...prev, [field]: e.target.value }));
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
                <div className="input-with-actions">
                  <input
                    type="text"
                    className="input-underlined"
                    placeholder="Nome do cliente"
                    value={form.client}
                    onChange={handleChange('client')}
                  />
                  {form.client && (
                    <X size={18} className="clear-icon" onClick={() => setForm(p => ({ ...p, client: '' }))} />
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

              {/* Contract */}
              <div className="form-group mt-4">
                <label>Contrato de prazo</label>
                <input
                  type="text"
                  className="input-underlined"
                  placeholder="Nome ou número do contrato"
                  value={form.contract}
                  onChange={handleChange('contract')}
                />
              </div>

              {/* Description */}
              <div className="form-group mt-4">
                <label>Descrição da ordem de serviço</label>
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
                      >
                        {COLLABORATORS.map(c => <option key={c}>{c}</option>)}
                      </select>
                    </div>
                    <ChevronDown size={18} className="select-arrow" />
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
