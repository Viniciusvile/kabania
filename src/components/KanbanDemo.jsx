import React, { useState, useEffect } from 'react';
import { BrainCircuit, AlertTriangle, CheckCircle2, Bot, ChevronRight } from 'lucide-react';
import './components.css';

export default function KanbanDemo() {
  const [activeTask, setActiveTask] = useState(null);
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    // Initial AI message sequence for the demo
    const timer1 = setTimeout(() => {
      setMessages([
        {
          id: 1,
          type: 'alert',
          title: 'Gargalo Detectado',
          text: 'A tarefa "Integração API Pagamento" está parada há 2 dias. No Projeto e-Commerce (2024), tivemos um atraso similar.',
          action: 'Ver Solução Passada'
        }
      ]);
      setActiveTask(2);
    }, 2000);

    return () => clearTimeout(timer1);
  }, []);

  const handleAction = () => {
    setMessages(prev => [
      ...prev,
      {
        id: 2,
        type: 'solution',
        title: 'Memória Técnica: Projeto 2024',
        text: 'A equipe resolveu isso atualizando o webhook de resposta e ignorando timeouts da sandbox. Segue o snippet:',
        code: 'if (env === "sandbox") { return handleMock(); }',
        action: 'Aplicar Sugestão'
      }
    ]);
  };

  return (
    <section id="demo" className="demo-section container">
      <div className="section-header">
        <h2 className="section-title">Como a Memória Histórica Atua</h2>
        <p className="section-subtitle">Veja como o Kabania detecta problemas e sugere soluções instantâneas baseadas no seu próprio histórico de desenvolvimento.</p>
      </div>

      <div className="kanban-container glass-panel">
        <div className="kanban-board" style={{ padding: '1rem' }}>
          <div className="kanban-column">
            <div className="column-header">
              <span>A Fazer</span>
              <span className="badge-count">1</span>
            </div>
            <div className="task-card">
              <div className="task-title">Atualizar Landing Page</div>
              <div className="task-tags">
                <span className="tag tag-feature">Feature</span>
              </div>
            </div>
          </div>
          
          <div className="kanban-column">
            <div className="column-header">
              <span>Em Progresso</span>
              <span className="badge-count">2</span>
            </div>
            <div className="task-card">
              <div className="task-title">Refatorar Auth Flow</div>
              <div className="task-tags">
                <span className="tag tag-feature">Feature</span>
              </div>
            </div>
            <div className={`task-card ${activeTask === 2 ? 'stuck' : ''}`}>
              <div className="task-title">Integração API Pagamento</div>
              <div className="task-meta" style={{ marginTop: '0.5rem', color: '#ef4444' }}>
                <AlertTriangle size={14} /> Estagnado (2 dias)
              </div>
              <div className="task-tags">
                <span className="tag tag-bug">Bug</span>
              </div>
            </div>
          </div>

          <div className="kanban-column">
            <div className="column-header">
              <span>Concluído</span>
              <span className="badge-count">15</span>
            </div>
            {/* Empty for demo focus */}
          </div>
        </div>

        <div className="ai-assistant">
          <div className="ai-header">
            <div className="ai-icon-bg">
              <BrainCircuit size={24} />
            </div>
            <div>
              <h3 style={{ fontWeight: 600, fontSize: '1.125rem' }}>Consultor Kabania</h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Analisando fluxo...</p>
            </div>
          </div>

          <div className="ai-messages">
            {messages.length === 0 && (
              <div className="text-center text-muted" style={{ padding: '1rem', fontSize: '0.875rem', marginTop: '2.5rem' }}>
                <Bot size={40} style={{ margin: '0 auto 0.75rem auto', opacity: 0.5, display: 'block' }} />
                Monitorando atividade do board para diagnosticar gargalos.
              </div>
            )}
            
            {messages.map((msg) => (
              <div key={msg.id} className={`ai-message fade-in ${msg.type === 'alert' ? 'alert' : ''}`}>
                <div className="message-header">
                  {msg.type === 'alert' ? <AlertTriangle size={16} className="text-red-500" /> : <CheckCircle2 size={16} className="text-green-500" />}
                  {msg.title}
                </div>
                <p>{msg.text}</p>
                {msg.code && (
                  <div className="solution-box">{msg.code}</div>
                )}
                {msg.action && msg.type === 'alert' && (
                  <div className="suggested-action">
                    <button onClick={handleAction} className="btn btn-secondary text-xs">
                      {msg.action} <ChevronRight size={14} />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
