import React, { useState, useEffect } from 'react';
import { X, Sparkles, CheckCircle2, Save, Copy } from 'lucide-react';
import './CardResponseModal.css';

export default function CardResponseModal({ task, currentUser, onClose, onUpdate, onResolve }) {
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
              <label>Descrição do Chamado</label>
              <div className="crm-modal-desc-box">
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

        {/* Footer Actions */}
        <div className="crm-modal-footer">
          <button 
            type="button" 
            className="crm-btn-secondary" 
            onClick={handleSaveOnly}
          >
            <Save size={16} /> Apenas Salvar
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
