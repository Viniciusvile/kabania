import React, { useState, useEffect } from 'react';
import { X, Trash2, ListChecks } from 'lucide-react';

const STATUSES = [
  { id: 'pending',     label: 'Pendente' },
  { id: 'in_progress', label: 'Em andamento' },
  { id: 'completed',   label: 'Concluído' },
  { id: 'blocked',     label: 'Bloqueado' }
];

export default function ProjectTaskModal({
  task,
  phaseId,
  phases,
  allTasks,
  project,
  onClose,
  onSave,
  onDelete
}) {
  const isNew = !task;

  const [form, setForm] = useState(() => ({
    title: task?.title || '',
    description: task?.description || '',
    assignee_email: task?.assignee_email || '',
    start_date: task?.start_date || project?.start_date || '',
    end_date: task?.end_date || project?.end_date || '',
    status: task?.status || 'pending',
    phase_id: task?.phase_id || phaseId || (phases[0]?.id ?? null),
    depends_on: task?.depends_on || []
  }));

  useEffect(() => {
    if (form.start_date && form.end_date && form.start_date > form.end_date) {
      setForm(prev => ({ ...prev, end_date: prev.start_date }));
    }
  }, [form.start_date, form.end_date]);

  const valid = form.title.trim().length > 0 && form.phase_id;

  const submit = () => {
    if (!valid) return;
    const payload = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      assignee_email: form.assignee_email.trim() || null,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      status: form.status,
      phase_id: form.phase_id,
      depends_on: form.depends_on
    };
    onSave(payload);
  };

  const candidateDeps = allTasks.filter(t => t.id !== task?.id);

  const toggleDep = (id) => {
    setForm(prev => ({
      ...prev,
      depends_on: prev.depends_on.includes(id)
        ? prev.depends_on.filter(x => x !== id)
        : [...prev.depends_on, id]
    }));
  };

  return (
    <div className="pm-modal-overlay" onClick={onClose}>
      <div className="pm-modal pm-modal-lg" onClick={e => e.stopPropagation()}>
        <div className="pm-modal-head">
          <div className="pm-modal-title">
            <ListChecks size={20} /> {isNew ? 'Nova Tarefa' : 'Detalhes da Tarefa'}
          </div>
          <button className="pm-icon-btn" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="pm-modal-body">
          <div className="pm-field">
            <label>Título</label>
            <input
              autoFocus
              value={form.title}
              onChange={e => setForm({ ...form, title: e.target.value })}
              placeholder='Ex: "Contratar pedreiro"'
            />
          </div>

          <div className="pm-field">
            <label>Descrição</label>
            <textarea
              rows={3}
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              placeholder="Detalhes, requisitos, contexto..."
            />
          </div>

          <div className="pm-field-row">
            <div className="pm-field">
              <label>Fase</label>
              <select
                value={form.phase_id || ''}
                onChange={e => setForm({ ...form, phase_id: e.target.value })}
              >
                {phases.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div className="pm-field">
              <label>Status</label>
              <select
                value={form.status}
                onChange={e => setForm({ ...form, status: e.target.value })}
              >
                {STATUSES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            </div>
          </div>

          <div className="pm-field-row">
            <div className="pm-field">
              <label>Início</label>
              <input
                type="date"
                value={form.start_date || ''}
                onChange={e => setForm({ ...form, start_date: e.target.value })}
              />
            </div>
            <div className="pm-field">
              <label>Fim</label>
              <input
                type="date"
                value={form.end_date || ''}
                onChange={e => setForm({ ...form, end_date: e.target.value })}
              />
            </div>
          </div>

          <div className="pm-field">
            <label>Responsável (email)</label>
            <input
              type="email"
              value={form.assignee_email}
              onChange={e => setForm({ ...form, assignee_email: e.target.value })}
              placeholder="colaborador@empresa.com"
            />
          </div>

          {candidateDeps.length > 0 && (
            <div className="pm-field">
              <label>Depende de</label>
              <div className="pm-deps-list">
                {candidateDeps.map(d => (
                  <label key={d.id} className="pm-dep-chip">
                    <input
                      type="checkbox"
                      checked={form.depends_on.includes(d.id)}
                      onChange={() => toggleDep(d.id)}
                    />
                    {d.title}
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="pm-modal-foot">
          {!isNew && onDelete && (
            <button className="pm-btn pm-btn-danger" onClick={onDelete}>
              <Trash2 size={16} /> Excluir
            </button>
          )}
          <div className="pm-modal-foot-right">
            <button className="pm-btn pm-btn-secondary" onClick={onClose}>Cancelar</button>
            <button className="pm-btn pm-btn-primary" disabled={!valid} onClick={submit}>
              {isNew ? 'Criar Tarefa' : 'Salvar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
