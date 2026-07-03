import React, { useState, useEffect } from 'react';
import { X, Sparkles, CheckCircle2, Save, Copy, CalendarClock, Wrench, ClipboardList } from 'lucide-react';
import './CardResponseModal.css';

export default function CardResponseModal({ task, currentUser, onClose, onUpdate, onResolve, onSendToShifts, onCreateActivity }) {
  const [responseText, setResponseText] = useState(task?.aiResponse || '');

  useEffect(() => {
    setResponseText(task?.aiResponse || '');
  }, [task?.aiResponse]);

  if (!task) return null;

  const handleCopyAiSuggestion = () => {
    if (task.aiResponse) {
      setResponseText(task.aiResponse);
    }
  };

  const handleSaveOnly = () => {
    const updatedTask = {
      ...task,
      aiResponse: responseText.trim() || null
    };
    onUpdate(updatedTask);
    onClose();
  };

  const handleResolve = () => {
    onResolve(task, responseText.trim());
    onClose();
  };

  return (
    <div className="crm-modal-overlay" onClick={onClose}>
      <div className="crm-modal-panel" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="crm-modal-header">
          <div className="crm-modal-title-area">
            <h2>Responder e Solucionar</h2>
            <span className="crm-modal-card-title">{task.title}</span>
          </div>
          <button className="crm-modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="crm-modal-body">
          {/* Original Ticket Description */}
          {task.desc && (
            <section className="crm-modal-section">
              <label>Descrição do Chamado <span className="crm-readonly-hint">(somente leitura)</span></label>
              <div className="crm-modal-desc-box crm-modal-desc-box--readonly">
                <p>{task.desc}</p>
              </div>
            </section>
          )}

          {/* AI Suggestion (Reference / Copiável) */}
          {task.aiResponse && (
            <section className="crm-modal-section">
              <div className="crm-modal-section-header">
                <label><Sparkles size={13} /> Sugestão da IA (Sugestão Inicial)</label>
                <button 
                  type="button" 
                  onClick={handleCopyAiSuggestion}
                  className="crm-copy-suggestion-btn"
                >
                  <Copy size={12} /> Copiar Sugestão
                </button>
              </div>
              <div className="crm-modal-ai-box">
                <p>{task.aiResponse}</p>
              </div>
            </section>
          )}

          {/* Final Response Form */}
          <section className="crm-modal-section">
            <label>Resposta Final (Será exibida no Card e enviada ao cliente)</label>
            <textarea
              className="crm-response-textarea"
              placeholder="Digite aqui a sua resposta ou solução definitiva para o card..."
              value={responseText}
              onChange={e => setResponseText(e.target.value)}
              rows={6}
              autoFocus
            />
          </section>
        </div>

        {/* Ações Rápidas */}
        {(onSendToShifts || onCreateActivity) && (
          <div className="crm-quick-actions">
            <span className="crm-qa-label">Ações Rápidas:</span>
            {onSendToShifts && (
              <button
                type="button"
                className="crm-qa-btn crm-qa-shifts"
                onClick={() => { onSendToShifts(task); onClose(); }}
                title="Agendar escala com base neste card"
              >
                <CalendarClock size={13} /> Agendar Escala
              </button>
            )}
            {onCreateActivity && (
              <>
                <button
                  type="button"
                  className="crm-qa-btn crm-qa-ticket"
                  onClick={() => { onCreateActivity(task, 'Manutenção'); onClose(); }}
                  title="Criar chamado técnico de Manutenção"
                >
                  <Wrench size={13} /> Chamado Técnico
                </button>
                <button
                  type="button"
                  className="crm-qa-btn crm-qa-activity"
                  onClick={() => { onCreateActivity(task, null); onClose(); }}
                  title="Adicionar à Lista de Atividades"
                >
                  <ClipboardList size={13} /> Adicionar à Atividades
                </button>
              </>
            )}
          </div>
        )}

        {/* Footer Actions */}
        <div className="crm-modal-footer">
          <button 
            type="button" 
            className="crm-btn-secondary" 
            onClick={handleSaveOnly}
          >
            <Save size={16} /> Salvar rascunho
          </button>
          <button 
            type="button" 
            className="crm-btn-primary" 
            onClick={handleResolve}
          >
            <CheckCircle2 size={16} /> Salvar e Solucionar Chamado
          </button>
        </div>
      </div>
    </div>
  );
}
