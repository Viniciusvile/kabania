import React, { useState } from 'react';
import { X, FolderPlus } from 'lucide-react';

const COLORS = ['#04D94F', '#0ea5e9', '#a78bfa', '#f59e0b', '#ef4444', '#ec4899'];

export default function NewProjectModal({ onClose, onCreate }) {
  const today = new Date().toISOString().slice(0, 10);
  const inOneMonth = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);

  const [form, setForm] = useState({
    name: '',
    description: '',
    start_date: today,
    end_date: inOneMonth,
    color: COLORS[0]
  });
  const [submitting, setSubmitting] = useState(false);

  const valid = form.name.trim().length > 0 && form.start_date && form.end_date && form.start_date <= form.end_date;

  const submit = async () => {
    if (!valid) return;
    setSubmitting(true);
    try {
      await onCreate(form);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="pm-modal-overlay" onClick={onClose}>
      <div className="pm-modal" onClick={e => e.stopPropagation()}>
        <div className="pm-modal-head">
          <div className="pm-modal-title">
            <FolderPlus size={20} /> Novo Projeto
          </div>
          <button className="pm-icon-btn" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="pm-modal-body">
          <div className="pm-field">
            <label>Nome do Projeto</label>
            <input
              autoFocus
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              placeholder='Ex: "Reforma do Condomínio A"'
            />
          </div>

          <div className="pm-field">
            <label>Descrição</label>
            <textarea
              rows={3}
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              placeholder="O que será entregue, contexto e objetivos."
            />
          </div>

          <div className="pm-field-row">
            <div className="pm-field">
              <label>Início</label>
              <input
                type="date"
                value={form.start_date}
                onChange={e => setForm({ ...form, start_date: e.target.value })}
              />
            </div>
            <div className="pm-field">
              <label>Fim</label>
              <input
                type="date"
                value={form.end_date}
                onChange={e => setForm({ ...form, end_date: e.target.value })}
              />
            </div>
          </div>

          <div className="pm-field">
            <label>Cor</label>
            <div className="pm-color-row">
              {COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  className={`pm-color-swatch ${form.color === c ? 'active' : ''}`}
                  style={{ background: c }}
                  onClick={() => setForm({ ...form, color: c })}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="pm-modal-foot">
          <button className="pm-btn pm-btn-secondary" onClick={onClose}>Cancelar</button>
          <button
            className="pm-btn pm-btn-primary"
            disabled={!valid || submitting}
            onClick={submit}
          >
            {submitting ? 'Criando...' : 'Criar Projeto'}
          </button>
        </div>
      </div>
    </div>
  );
}
