import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { suggestEmailTags } from '../services/geminiService';
import { 
  Mail, 
  Sparkles, 
  Send, 
  Eye, 
  Trash2, 
  Plus, 
  Check, 
  AlertCircle,
  X,
  FileText,
  Clock,
  User,
  Tags
} from 'lucide-react';
import './EmailArea.css';

export default function EmailArea({ currentCompany, currentUser }) {
  // Form fields
  const [recipient, setRecipient] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');

  // AI & action states
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [selectedTags, setSelectedTags] = useState(new Set());

  // History states
  const [sentEmails, setSentEmails] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  // Modal detail states
  const [detailEmail, setDetailEmail] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Load history on mount or company change
  useEffect(() => {
    fetchHistory();
  }, [currentCompany?.id]);

  const fetchHistory = async () => {
    if (!currentCompany?.id) return;
    setLoadingHistory(true);

    try {
      // 1. Try to fetch from Supabase
      const { data, error } = await supabase
        .from('sent_emails')
        .select('*')
        .eq('company_id', currentCompany.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSentEmails(data || []);
    } catch (err) {
      console.warn("Supabase table 'sent_emails' not found or RLS error. Falling back to local storage.", err.message);
      // 2. Fallback to LocalStorage
      const localData = localStorage.getItem(`synapse_emails_${currentCompany.id}`);
      if (localData) {
        setSentEmails(JSON.parse(localData));
      } else {
        setSentEmails([]);
      }
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleAnalyze = async (e) => {
    e.preventDefault();
    if (!subject.trim() || !body.trim()) {
      alert("Por favor, preencha o Assunto e o Corpo do e-mail para que a IA possa analisá-los.");
      return;
    }

    setIsAnalyzing(true);
    setAiAnalysis(null);
    setSelectedTags(new Set());

    try {
      const result = await suggestEmailTags(subject, body, currentCompany?.id);
      if (result) {
        setAiAnalysis(result);
        
        // Auto-apply suggested tags
        const initialTags = new Set();
        if (result.suggestedTags) {
          result.suggestedTags.forEach(t => initialTags.add(t));
        }
        setSelectedTags(initialTags);
      } else {
        alert("A IA não conseguiu analisar o e-mail no momento. Tente novamente.");
      }
    } catch (error) {
      console.error(error);
      alert("Erro durante a análise com IA: " + error.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const toggleTag = (tag) => {
    setSelectedTags(prev => {
      const next = new Set(prev);
      if (next.has(tag)) {
        next.delete(tag);
      } else {
        next.add(tag);
      }
      return next;
    });
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!recipient.trim() || !subject.trim() || !body.trim()) {
      alert("Por favor, preencha todos os campos do e-mail (Destinatário, Assunto e Corpo).");
      return;
    }

    setIsSending(true);

    const emailPayload = {
      company_id: currentCompany.id,
      sender: currentUser,
      recipient: recipient,
      subject: subject,
      body: body,
      tags: Array.from(selectedTags),
      category: aiAnalysis?.category || 'Geral',
      summary: aiAnalysis?.summary || '',
      tone: aiAnalysis?.toneAnalysis || '',
    };

    try {
      // 1. Try to insert to Supabase
      const { data, error } = await supabase
        .from('sent_emails')
        .insert([emailPayload])
        .select();

      if (error) throw error;
      
      // Refresh history from db
      await fetchHistory();
      handleClearForm();
      alert("E-mail simulado e registrado com sucesso!");
    } catch (err) {
      console.warn("Could not persist to Supabase. Saving to Local Storage fallback.", err.message);
      
      // 2. Fallback to LocalStorage
      const localDataKey = `synapse_emails_${currentCompany.id}`;
      const existing = localStorage.getItem(localDataKey);
      const emailList = existing ? JSON.parse(existing) : [];
      
      const newEmail = {
        id: crypto.randomUUID(),
        ...emailPayload,
        created_at: new Date().toISOString()
      };
      
      const updatedList = [newEmail, ...emailList];
      localStorage.setItem(localDataKey, JSON.stringify(updatedList));
      
      setSentEmails(updatedList);
      handleClearForm();
      alert("E-mail registrado localmente com sucesso! (Tabela do banco de dados pendente de migração)");
    } finally {
      setIsSending(false);
    }
  };

  const handleClearForm = () => {
    setRecipient('');
    setSubject('');
    setBody('');
    setAiAnalysis(null);
    setSelectedTags(new Set());
  };

  const handleOpenDetail = (email) => {
    setDetailEmail(email);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setDetailEmail(null);
  };

  return (
    <div className="email-area-container">
      <header className="email-header-section">
        <h1>
          <Mail size={32} />
          Central de E-mails
        </h1>
      </header>

      <div className="email-dashboard-grid">
        {/* Left Column - Compose E-mail */}
        <section className="email-card">
          <div className="email-card-title">
            <Mail size={18} className="text-indigo-400" />
            Nova Mensagem
          </div>

          <form className="email-form" onSubmit={handleSend}>
            <div className="form-group">
              <label htmlFor="email-recipient">Para (Destinatário)</label>
              <input 
                id="email-recipient"
                type="email" 
                placeholder="cliente@exemplo.com"
                className="form-input"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="email-subject">Assunto</label>
              <input 
                id="email-subject"
                type="text" 
                placeholder="Digite o assunto do e-mail"
                className="form-input"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="email-body">Mensagem (Corpo do E-mail)</label>
              <textarea 
                id="email-body"
                placeholder="Escreva sua mensagem aqui..."
                className="form-textarea"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                required
              />
            </div>

            <div className="email-actions">
              <button 
                id="btn-clear-email"
                type="button" 
                className="btn-email btn-email-secondary"
                onClick={handleClearForm}
                disabled={isSending || isAnalyzing}
              >
                Limpar
              </button>
              <button 
                id="btn-analyze-ai"
                type="button" 
                className="btn-email btn-email-secondary"
                style={{ border: '1px solid rgba(255, 255, 255, 0.3)', color: 'var(--accent-cyan)' }}
                onClick={handleAnalyze}
                disabled={isAnalyzing || isSending || !subject.trim() || !body.trim()}
              >
                <Sparkles size={16} />
                {isAnalyzing ? "Analisando..." : "Sugerir Tags"}
              </button>
              <button 
                id="btn-send-email"
                type="submit" 
                className="btn-email btn-email-primary"
                disabled={isSending || isAnalyzing}
              >
                <Send size={16} />
                {isSending ? "Enviando..." : "Enviar E-mail"}
              </button>
            </div>
          </form>
        </section>

        {/* Right Column - AI Tags & Analysis */}
        <section className="email-card" style={{ background: 'rgba(255, 255, 255, 0.01)' }}>
          <div className="email-card-title">
            <Sparkles size={18} className="text-yellow-400" />
            Análise Inteligente e Tags
          </div>

          <div className="ai-panel-content">
            {isAnalyzing ? (
              <div className="ai-loading-state">
                <div className="ai-spinner" />
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                  A IA está analisando sua mensagem com base nas regras da empresa...
                </p>
              </div>
            ) : aiAnalysis ? (
              <div className="ai-analysis-results">
                {/* Tone and Category */}
                <div className="ai-meta-pills">
                  {aiAnalysis.category && (
                    <div className="meta-pill meta-pill-category">
                      Categoria: {aiAnalysis.category}
                    </div>
                  )}
                  {aiAnalysis.toneAnalysis && (
                    <div className="meta-pill meta-pill-tone">
                      Tom: {aiAnalysis.toneAnalysis}
                    </div>
                  )}
                </div>

                {/* AI Summary */}
                {aiAnalysis.summary && (
                  <div className="ai-result-row">
                    <span className="ai-result-label">Resumo Executivo</span>
                    <div className="ai-summary-box">
                      "{aiAnalysis.summary}"
                    </div>
                  </div>
                )}

                {/* Authorized Tags (Personalized) */}
                <div className="ai-result-row">
                  <span className="ai-result-label">Tags Autorizadas Identificadas</span>
                  {aiAnalysis.suggestedTags && aiAnalysis.suggestedTags.length > 0 ? (
                    <div className="ai-badges-container">
                      {aiAnalysis.suggestedTags.map(tag => (
                        <button
                          key={tag}
                          type="button"
                          id={`tag-auth-${tag}`}
                          className={`tag-pill tag-pill-authorized ${selectedTags.has(tag) ? 'tag-pill-active' : ''}`}
                          onClick={() => toggleTag(tag)}
                        >
                          {selectedTags.has(tag) && <Check size={12} />}
                          {tag}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-dark)', fontStyle: 'italic' }}>
                      Nenhuma tag da base autorizada diretamente relacionada.
                    </span>
                  )}
                </div>

                {/* Additional Suggested Tags */}
                {aiAnalysis.additionalTags && aiAnalysis.additionalTags.length > 0 && (
                  <div className="ai-result-row">
                    <span className="ai-result-label">Tags Complementares Recomendadas</span>
                    <div className="ai-badges-container">
                      {aiAnalysis.additionalTags.map(tag => (
                        <button
                          key={tag}
                          type="button"
                          id={`tag-add-${tag}`}
                          className={`tag-pill tag-pill-additional ${selectedTags.has(tag) ? 'tag-pill-active' : ''}`}
                          onClick={() => toggleTag(tag)}
                        >
                          {selectedTags.has(tag) && <Check size={12} />}
                          {tag}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div style={{ fontSize: '0.75rem', color: 'var(--text-dark)', marginTop: '0.5rem', lineHeight: '1.4' }}>
                  💡 Clique nas tags acima para ativá-las ou desativá-las antes de enviar o e-mail.
                </div>
              </div>
            ) : (
              <div className="ai-empty-state">
                <Sparkles size={48} className="ai-empty-state-icon" />
                <p style={{ fontWeight: 600, color: 'var(--text-muted)' }}>Aguardando Mensagem</p>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-dark)', maxWidth: '240px' }}>
                  Escreva um e-mail ao lado e clique em <b>Sugerir Tags</b> para triagem inteligente.
                </p>
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Bottom Section - Sent E-mails History */}
      <section className="email-card email-history-card">
        <div className="email-card-title" style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FileText size={18} className="text-green-400" />
            Histórico de Comunicações
          </div>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-dark)' }}>
            Total: {sentEmails.length}
          </span>
        </div>

        {loadingHistory ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
            Carregando histórico de e-mails...
          </div>
        ) : sentEmails.length > 0 ? (
          <div className="email-table-wrapper">
            <table className="email-table">
              <thead>
                <tr>
                  <th>Destinatário</th>
                  <th>Assunto</th>
                  <th>Categoria</th>
                  <th>Tags Associadas</th>
                  <th>Data</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {sentEmails.map(email => (
                  <tr key={email.id}>
                    <td className="email-row-recipient">{email.recipient}</td>
                    <td className="email-row-subject">{email.subject}</td>
                    <td>
                      {email.category ? (
                        <span className="badge" style={{ background: 'rgba(249, 115, 22, 0.1)', color: 'var(--color-orange)' }}>
                          {email.category}
                        </span>
                      ) : '-'}
                    </td>
                    <td>
                      <div className="email-row-tags">
                        {email.tags && email.tags.length > 0 ? (
                          email.tags.map((t, idx) => (
                            <span 
                              key={idx} 
                              className={`email-row-tag-badge ${aiAnalysis?.suggestedTags?.includes(t) ? 'email-row-tag-badge-auth' : ''}`}
                            >
                              {t}
                            </span>
                          ))
                        ) : (
                          <span style={{ color: 'var(--text-dark)', fontStyle: 'italic', fontSize: '0.8rem' }}>Sem tags</span>
                        )}
                      </div>
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                      {new Date(email.created_at).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>
                    <td>
                      <button 
                        id={`btn-view-email-${email.id}`}
                        className="btn-icon-table"
                        onClick={() => handleOpenDetail(email)}
                        title="Ver Detalhes"
                      >
                        <Eye size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="email-history-empty">
            <Mail size={32} style={{ opacity: 0.3 }} />
            <p>Nenhum e-mail enviado recentemente.</p>
          </div>
        )}
      </section>

      {/* Email View Modal */}
      {isModalOpen && detailEmail && (
        <div className="email-modal-overlay" onClick={handleCloseModal}>
          <div className="email-modal" onClick={(e) => e.stopPropagation()}>
            <header className="email-modal-header">
              <h2>Detalhes da Mensagem</h2>
              <button 
                id="btn-close-email-modal"
                className="btn-close-modal" 
                onClick={handleCloseModal}
              >
                <X size={20} />
              </button>
            </header>

            <div className="email-modal-body">
              <div className="email-meta-info">
                <div className="email-meta-line">
                  <span className="email-meta-label">Para:</span>
                  <span className="email-meta-val">{detailEmail.recipient}</span>
                </div>
                <div className="email-meta-line">
                  <span className="email-meta-label">Assunto:</span>
                  <span className="email-meta-val" style={{ fontWeight: 700 }}>{detailEmail.subject}</span>
                </div>
                <div className="email-meta-line">
                  <span className="email-meta-label">Remetente:</span>
                  <span className="email-meta-val" style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{detailEmail.sender}</span>
                </div>
                <div className="email-meta-line">
                  <span className="email-meta-label">Data:</span>
                  <span className="email-meta-val">
                    {new Date(detailEmail.created_at).toLocaleString('pt-BR')}
                  </span>
                </div>
              </div>

              <div className="email-body-content">
                {detailEmail.body}
              </div>

              {(detailEmail.category || detailEmail.tone || (detailEmail.tags && detailEmail.tags.length > 0)) && (
                <div className="email-analysis-section">
                  <h3 style={{ fontSize: '0.95rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em' }}>
                    Análise e Classificação de Tags
                  </h3>
                  
                  <div className="ai-meta-pills">
                    {detailEmail.category && (
                      <div className="meta-pill meta-pill-category">
                        Categoria: {detailEmail.category}
                      </div>
                    )}
                    {detailEmail.tone && (
                      <div className="meta-pill meta-pill-tone">
                        Tom: {detailEmail.tone}
                      </div>
                    )}
                  </div>

                  {detailEmail.summary && (
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-main)', fontStyle: 'italic', background: 'rgba(255,255,255,0.01)', padding: '0.75rem', borderRadius: '8px', borderLeft: '3px solid var(--accent-cyan)' }}>
                      "{detailEmail.summary}"
                    </div>
                  )}

                  {detailEmail.tags && detailEmail.tags.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Tags Salvas:</span>
                      <div className="ai-badges-container">
                        {detailEmail.tags.map((t, i) => (
                          <span key={i} className="tag-pill tag-pill-active" style={{ cursor: 'default' }}>
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
