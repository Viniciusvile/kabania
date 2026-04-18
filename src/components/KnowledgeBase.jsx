import React, { useState, useEffect } from 'react';
import { BookOpen, Database, FileText, CheckCircle, Search, ToggleRight, ToggleLeft, Plus, X, Trash2, Edit2, Lock, Sparkles, RotateCcw } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { SECTOR_TEMPLATES } from './CompanySetup';
import { fileProcessingService } from '../services/fileProcessingService';
import { processKnowledgeFile } from '../services/geminiService';
import { getRecommendations, invalidateCache } from '../services/kbService';
import { logEvent } from '../services/historyService';
import './KnowledgeBase.css';

const KB_SECTIONS = [
  { id: 'company_data', label: 'Dados da Empresa', icon: '🏢' },
  { id: 'troubleshooting', label: 'Resolução de Problemas', icon: '🛠️' },
  { id: 'general', label: 'Geral / Outros', icon: '📚' }
];

export default function KnowledgeBase({ currentUser, currentCompany, userRole, onRunBulkImport }) {
  const isAdmin = userRole === 'admin';

  const [knowledgeItems, setKnowledgeItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newTags, setNewTags] = useState('');
  const [newSection, setNewSection] = useState('general');
  const [editingItem, setEditingItem] = useState(null);
  const [feedback, setFeedback] = useState({ isOpen: false, title: '', message: '', type: 'info', onConfirm: null });
  const [isUploading, setIsUploading] = useState(false);
  const [isUploadGuideOpen, setIsUploadGuideOpen] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState(null); // { action, suggested, explanation }
  const [relatedMap, setRelatedMap] = useState({}); // { [articleId]: { loading, ids } }
  const fileInputRef = React.useRef(null);

  const handleToggleRelated = async (item) => {
    const id = item.id;
    // Toggle off if already shown
    if (relatedMap[id] && !relatedMap[id].loading) {
      setRelatedMap(prev => { const n = { ...prev }; delete n[id]; return n; });
      return;
    }
    // Already loading — ignore
    if (relatedMap[id]?.loading) return;

    setRelatedMap(prev => ({ ...prev, [id]: { loading: true, ids: [] } }));
    // kbService handles caching internally (24h TTL in localStorage)
    const ids = await getRecommendations(item, knowledgeItems, currentCompany?.id);
    setRelatedMap(prev => ({ ...prev, [id]: { loading: false, ids } }));
  };

  const showFeedback = (title, message, type = 'info', onConfirm = null) => {
    setFeedback({ isOpen: true, title, message, type, onConfirm });
  };

  // Fetch from Supabase with Caching
  useEffect(() => {
    const fetchKnowledge = async () => {
      if (!currentCompany?.id) {
        setLoading(false);
        return;
      }

      // Check cache first for instant hydration
      const cached = localStorage.getItem(`kb_cache_${currentCompany.id}`);
      if (cached) {
        setKnowledgeItems(JSON.parse(cached));
        setLoading(false); // Immediate data, no spinner needed
      }

      const { data, error } = await supabase
        .from('knowledge_base')
        .select('*')
        .eq('company_id', currentCompany.id)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setKnowledgeItems(data);
        localStorage.setItem(`kb_cache_${currentCompany.id}`, JSON.stringify(data));
      } else if (error) {
        console.error('Error fetching knowledge:', error);
      }
      setLoading(false);
    };

    fetchKnowledge();
  }, [currentCompany]);

  const toggleItem = async (id) => {
    if (!isAdmin) return;
    const item = knowledgeItems.find(it => it.id === id);
    if (!item) return;

    // OPTIMISTIC UPDATE
    const newStatus = !item.enabled;
    setKnowledgeItems(prev => prev.map(it =>
      it.id === id ? { ...it, enabled: newStatus } : it
    ));

    const { error } = await supabase
      .from('knowledge_base')
      .update({ enabled: newStatus })
      .eq('id', id);

    if (error) {
      console.error('Error toggling item:', error);
      // Rollback
      setKnowledgeItems(prev => prev.map(it =>
        it.id === id ? { ...it, enabled: !newStatus } : it
      ));
    } else {
      // Update cache
      const updated = knowledgeItems.map(it => it.id === id ? { ...it, enabled: newStatus } : it);
      localStorage.setItem(`kb_cache_${currentCompany.id}`, JSON.stringify(updated));
    }
  };

  const deleteItem = async (id) => {
    if (!isAdmin) return;
    const { error } = await supabase
      .from('knowledge_base')
      .delete()
      .eq('id', id);

    if (!error) {
      setKnowledgeItems(prev => prev.filter(item => item.id !== id));
    }
  };

  const handleEdit = (item) => {
    if (!isAdmin) return;
    setEditingItem(item);
    setNewTitle(item.title);
    setNewDesc(item.description);
    setNewTags(item.tags.join(', '));
    setNewSection(item.section || 'general');
    setIsModalOpen(true);
  };

  const filteredItems = knowledgeItems.filter(item =>
    item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getIconForType = (type) => {
    switch (type) {
      case 'database': return <Database size={20} color="var(--accent-cyan)" />;
      case 'document': return <FileText size={20} color="#60a5fa" />;
      case 'file': return <BookOpen size={20} color="#4ade80" />;
      default: return <FileText size={20} color="var(--accent-cyan)" />;
    }
  };

  const handleLoadTemplates = () => {
    if (!isAdmin || !currentCompany?.sector || !SECTOR_TEMPLATES[currentCompany.sector]) return;
    
    showFeedback(
      'Atenção: Limpeza Total',
      `Esta ação irá APAGAR PERMANENTEMENTE todos os itens atuais da sua Base de Conhecimento antes de carregar os padrões do setor: ${SECTOR_TEMPLATES[currentCompany.sector].label}. Deseja continuar?`,
      'confirm',
      confirmLoadTemplates
    );
  };

  const confirmLoadTemplates = async () => {
    setFeedback(prev => ({ ...prev, isOpen: false }));
    setLoading(true);
    try {
      // 1. Wipe existing items for this company
      const { error: deleteError } = await supabase
        .from('knowledge_base')
        .delete()
        .eq('company_id', currentCompany.id);

      if (deleteError) {
        throw new Error(`Erro ao limpar base atual: ${deleteError.message}`);
      }

      const template = SECTOR_TEMPLATES[currentCompany.sector];
      const globalDefaults = [
        { title: 'Fundação e Visão', desc: 'Dados sobre a fundação da empresa, missão, visão e valores corporativos.', type: 'document', tag: 'Empresa', section: 'company_data' },
        { title: 'Estrutura Organizacional', desc: 'Informações sobre departamentos, hierarquia e contatos chave.', type: 'file', tag: 'Estrutura', section: 'company_data' },
        { title: 'Políticas Internas', desc: 'Regimento interno, normas de conduta, horários e benefícios.', type: 'file', tag: 'Regras', section: 'company_data' },
        { title: 'Guia de Problemas Comuns', desc: 'Passo a passo para resolver os erros mais frequentes reportados pelo time.', type: 'database', tag: 'Suporte', section: 'troubleshooting' },
        { title: 'Protocolo de Emergência', desc: 'O que fazer em caso de incidentes críticos ou paradas de sistema.', type: 'document', tag: 'Crítico', section: 'troubleshooting' },
        { title: 'Base de Conhecimento Geral', desc: 'Informações gerais de suporte, manuais e FAQ do time.', type: 'database', tag: 'Geral', section: 'general' }
      ];

      const timestamp = Date.now();
      const itemsToInsert = [
        ...globalDefaults.map((d, i) => ({
          id: `kb-def-${timestamp}-${i}-${Math.random().toString(36).substr(2, 5)}`,
          company_id: currentCompany.id,
          title: d.title,
          description: d.desc,
          enabled: true,
          type: d.type,
          tags: [d.tag],
          section: d.section
        })),
        ...template.tags.map((tag, idx) => ({
          id: `kb-sec-${timestamp}-${idx}-${Math.random().toString(36).substr(2, 5)}`,
          company_id: currentCompany.id,
          title: tag,
          description: `Assunto autorizado: ${tag} (${template.label})`,
          enabled: true,
          type: 'document',
          tags: [tag],
          section: 'general'
        }))
      ];

      const { data, error } = await supabase.from('knowledge_base').insert(itemsToInsert).select();
      
      if (!error) {
        setKnowledgeItems(data || itemsToInsert);
        logEvent(currentCompany.id, currentUser, 'RESET_KB_TEMPLATES', `Base reiniciada com ${itemsToInsert.length} temas para o setor ${template.label}.`);
        showFeedback('Sucesso', 'Base de conhecimento restaurada com os padrões do setor!', 'info');
      } else {
        throw error;
      }
    } catch (err) {
      console.error('Crash in handleLoadTemplates:', err);
      showFeedback('Erro', 'Ocorreu um erro inesperado ao processar os temas.', 'info');
    } finally {
      setLoading(false);
    }
  };

  const handleAddNew = async (e) => {
    e.preventDefault();
    if (!newTitle.trim() || !newDesc.trim()) return;

    const parsedTags = newTags.split(',').map(t => t.trim()).filter(t => t.length > 0);

    if (editingItem) {
      const payload = {
        title: newTitle.trim(),
        description: newDesc.trim(),
        tags: parsedTags.length > 0 ? parsedTags : editingItem.tags,
        section: newSection
      };

      // OPTIMISTIC
      setKnowledgeItems(prev => prev.map(item =>
        item.id === editingItem.id ? { ...item, ...payload } : item
      ));

      const { error } = await supabase
        .from('knowledge_base')
        .update(payload)
        .eq('id', editingItem.id);

      if (error) {
        console.error("Update error:", error);
      } else {
        // Invalidate stale recommendations for this article
        invalidateCache(currentCompany?.id, editingItem.id);
        setRelatedMap(prev => { const n = { ...prev }; delete n[editingItem.id]; return n; });
      }
    } else {
      const newItem = {
        id: `kb-${Date.now()}`,
        title: newTitle.trim(),
        description: newDesc.trim(),
        enabled: true,
        type: 'document',
        tags: parsedTags.length > 0 ? parsedTags : ['Adicionado Manualmente'],
        section: newSection,
        company_id: currentCompany?.id,
        created_at: new Date().toISOString()
      };

      // OPTIMISTIC
      setKnowledgeItems(prev => [newItem, ...prev]);

      const { error } = await supabase
        .from('knowledge_base')
        .insert([newItem]);

      if (error) {
        console.error("Insert error:", error);
        setKnowledgeItems(prev => prev.filter(it => it.id !== newItem.id));
      } else {
        // Refresh cache
        localStorage.setItem(`kb_cache_${currentCompany.id}`, JSON.stringify([newItem, ...knowledgeItems]));
      }
    }

    setNewTitle('');
    setNewDesc('');
    setNewTags('');
    setEditingItem(null);
    setIsModalOpen(false);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !isAdmin) return;

    setIsUploading(true);
    try {
      // 1. Extract Text
      const result = await fileProcessingService.extractText(file);
      
      if (result.type === 'structured') {
        // Handle CSV Bulk via App (Background)
        onRunBulkImport(result.content, knowledgeItems);
        showFeedback('Importação Iniciada', 'Sua planilha está sendo processada em segundo plano. Você pode continuar usando o sistema normalmente.', 'info');
      } else {
        // 2. Process single file with AI
        const suggestion = await processKnowledgeFile(result.content, knowledgeItems);
        setAiSuggestion(suggestion);
      }
    } catch (err) {
      console.error('Upload error:', err);
      showFeedback('Erro no Upload', err.message || 'Não foi possível processar o arquivo.', 'info');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };


  const confirmAiSuggestion = async () => {
    if (!aiSuggestion) return;
    
    const { action, suggested, existingId } = aiSuggestion;
    
    if (action === 'merge' && existingId) {
      // Logic to merge: Update existing item's description and tags
      const existingItem = knowledgeItems.find(it => it.id === existingId);
      if (existingItem) {
        const payload = {
          description: `${existingItem.description}\n\n[Atualização via IA]: ${suggested.description}`,
          tags: [...new Set([...existingItem.tags, ...suggested.tags])],
          section: suggested.section || existingItem.section
        };
        
        // Optimistic
        setKnowledgeItems(prev => prev.map(it => 
          it.id === existingId ? { ...it, ...payload } : it
        ));

        const { error } = await supabase.from('knowledge_base').update(payload).eq('id', existingId);
        if (!error) {
          logEvent(currentCompany.id, currentUser, 'MERGE_KB_FILE', `Informação mesclada ao tema: ${existingItem.title}`);
        }
      }
    } else {
      // Logic to create new
      const newItem = {
        id: `kb-${Date.now()}`,
        title: suggested.title,
        description: suggested.description,
        enabled: true,
        type: 'file',
        tags: suggested.tags,
        section: suggested.section || 'general',
        company_id: currentCompany?.id,
        created_at: new Date().toISOString()
      };

      setKnowledgeItems(prev => [newItem, ...prev]);
      const { error } = await supabase.from('knowledge_base').insert([newItem]);
      if (!error) {
        logEvent(currentCompany.id, currentUser, 'UPLOAD_KB_FILE', `Novo tema criado via upload: ${suggested.title}`);
      }
    }
    
    setAiSuggestion(null);
    showFeedback('Sucesso', 'Conhecimento integrado com sucesso!', 'info');
  };

  return (
    <div className="knowledge-base-container animate-fade-in">
      <div className="kb-sidebar-side">
        <header className="kb-header">
          <h1 className="kb-title">
            <BookOpen color="var(--accent-cyan)" /> Base de Autorizações (TAGS) da IA
          </h1>
          <p className="kb-subtitle">
            {currentCompany
              ? `Base de conhecimento compartilhada da empresa "${currentCompany.name}". `
              : ''}
            Ative ou desative os temas autorizados. A IA só responderá se o tema possuir uma TAG ativa aqui.
            {!isAdmin && <span className="kb-readonly-notice"> <Lock size={13} /> Somente administradores podem editar.</span>}
          </p>
        </header>

        <div className="kb-actions-bar">
          <div className="kb-search">
            <Search size={18} color="var(--text-muted)" />
            <input
              type="text"
              placeholder="Buscar temas / tags de liberação..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="kb-actions-btns">
            {isAdmin && currentCompany?.sector && SECTOR_TEMPLATES[currentCompany.sector] && (
              <button className="kb-btn-template" onClick={handleLoadTemplates} title="Recarregar temas padrão do setor">
                <Sparkles size={18} /> Restaurar Preset
              </button>
            )}
            {isAdmin && (
              <div className="kb-upload-wrapper">
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept=".pdf,.docx,.txt,.csv"
                  onChange={handleFileUpload}
                />
                <button 
                  className="kb-btn-add" 
                  onClick={() => setIsUploadGuideOpen(true)}
                  disabled={isUploading}
                >
                  {isUploading ? <RotateCcw className="animate-spin" size={18} /> : <Plus size={18} />}
                  {isUploading ? 'Lendo Arquivo...' : 'Conectar Nova Fonte'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="kb-main-content">
        <div className="kb-sections-container">
        {KB_SECTIONS.map(section => {
          const sectionItems = filteredItems.filter(item => (item.section || 'general') === section.id);
          if (sectionItems.length === 0 && searchTerm) return null; // Hide empty sections when searching

          return (
            <div key={section.id} className="kb-section-group">
              <div className="kb-section-header">
                <span className="kb-section-icon">{section.icon}</span>
                <h2 className="kb-section-title">{section.label}</h2>
                <span className="kb-section-count">{sectionItems.length} temas</span>
              </div>
              
              <div className="kb-grid">
                {sectionItems.map(item => (
                  <div key={item.id} className={`kb-card ${item.enabled ? 'enabled' : 'disabled'} ${relatedMap[item.id] ? 'kb-card--expanded' : ''}`}>
                    <div className="kb-card-header">
                      <div className="kb-icon-wrapper">{getIconForType(item.type)}</div>
                      <div className="flex items-center gap-2">
                        {isAdmin && (
                          <>
                            <button onClick={() => handleEdit(item)} className="kb-delete-btn" title="Editar" style={{ color: 'var(--text-muted)' }}>
                              <Edit2 size={16} />
                            </button>
                            <button onClick={() => deleteItem(item.id)} className="kb-delete-btn" title="Excluir">
                              <Trash2 size={16} />
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => toggleItem(item.id)}
                          className={`kb-toggle-btn ${item.enabled ? 'active' : 'inactive'} ${!isAdmin ? 'disabled-toggle' : ''}`}
                          title={isAdmin ? (item.enabled ? 'Desativar' : 'Ativar') : 'Apenas administradores podem alterar'}
                          disabled={!isAdmin}
                        >
                          {item.enabled ? <ToggleRight size={32} /> : <ToggleLeft size={32} />}
                        </button>
                      </div>
                    </div>

                    <h3 className="kb-card-title">{item.title}</h3>
                    <p className="kb-card-desc">{item.description}</p>

                    <div className="kb-card-footer">
                      <div className="kb-tags">
                        {item.tags.map(tag => (
                          <span key={tag} className="kb-tag">{tag}</span>
                        ))}
                      </div>
                      <div className="kb-status-wrapper">
                        {item.enabled
                          ? <span className="kb-status active"><CheckCircle size={14} /> Ativo no Contexto</span>
                          : <span className="kb-status inactive">Inativo</span>
                        }
                      </div>
                    </div>

                    {/* ✨ Related Articles */}
                    <button
                      className={`kb-related-btn ${relatedMap[item.id] ? 'active' : ''}`}
                      onClick={() => handleToggleRelated(item)}
                      title="Ver artigos relacionados por IA"
                    >
                      <Sparkles size={12} />
                      {relatedMap[item.id]
                        ? relatedMap[item.id].loading ? 'Buscando...' : 'Ocultar relacionados'
                        : 'Ver relacionados IA'}
                    </button>

                    {relatedMap[item.id] && !relatedMap[item.id].loading && (
                      <div className="kb-related-panel">
                        {relatedMap[item.id].ids.length === 0 ? (
                          <p className="kb-related-empty">Nenhum artigo relacionado encontrado.</p>
                        ) : (
                          <>
                            <p className="kb-related-label">Artigos relacionados</p>
                            <div className="kb-related-list">
                              {relatedMap[item.id].ids.map(rid => {
                                const rel = knowledgeItems.find(k => k.id === rid);
                                if (!rel) return null;
                                return (
                                  <div key={rid} className="kb-related-chip">
                                    <span className="kb-related-chip-icon">{getIconForType(rel.type)}</span>
                                    <span className="kb-related-chip-title">{rel.title}</span>
                                    <span className={`kb-related-chip-status ${rel.enabled ? 'on' : 'off'}`}>
                                      {rel.enabled ? 'Ativo' : 'Inativo'}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </>
                        )}
                      </div>
                    )}

                    {relatedMap[item.id]?.loading && (
                      <div className="kb-related-loading">
                        <Sparkles size={12} className="kb-related-spin" /> Analisando artigos...
                      </div>
                    )}
                  </div>
                ))}
                
                {sectionItems.length === 0 && (
                  <div 
                    className="kb-card kb-card-empty-slot animate-pulse-slow" 
                    onClick={() => isAdmin && setIsUploadGuideOpen(true)}
                  >
                    <Plus size={32} strokeWidth={1} />
                    <span>Adicionar em {section.label}</span>
                    <p className="text-[10px] opacity-40 mt-1">Clique para subir PDF, Word ou CSV</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {filteredItems.length === 0 && (
          <div className="kb-empty">
            {knowledgeItems.length === 0
              ? (
                <div className="kb-empty-content">
                  <p>Nenhum tema cadastrado. {isAdmin ? 'Clique em "Conectar Nova Fonte" para começar.' : 'Aguarde o administrador configurar a base.'}</p>
                  {isAdmin && currentCompany?.sector && SECTOR_TEMPLATES[currentCompany.sector]?.tags.length > 0 && (
                    <button className="kb-btn-template" onClick={handleLoadTemplates}>
                      <Sparkles size={16} /> Carregar Sugestões do Setor ({SECTOR_TEMPLATES[currentCompany.sector].label})
                    </button>
                  )}
                </div>
              )
              : 'Nenhum tema encontrado com esse nome.'}
          </div>
        )}
      </div>
    </div>

    {isModalOpen && isAdmin && (
        <div className="kb-modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="kb-modal" onClick={e => e.stopPropagation()}>
            <div className="kb-modal-header">
              <h2>
                {editingItem ? <Edit2 size={18} color="var(--accent-cyan)" /> : <Plus size={18} color="var(--accent-cyan)" />}
                {editingItem ? ' Editar Tema / Autorização' : ' Adicionar Tema / Autorização'}
              </h2>
              <button className="kb-modal-close" onClick={() => { setIsModalOpen(false); setEditingItem(null); }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddNew}>
              <div className="kb-modal-body">
                <div className="kb-form-group">
                  <label htmlFor="kb-title">Título / Motivo</label>
                  <input
                    id="kb-title"
                    type="text"
                    className="kb-form-input"
                    placeholder="Ex: Resolução de Bug de Login (2025)"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    required
                  />
                </div>

                <div className="kb-form-group">
                  <label htmlFor="kb-desc">Descrição do Tema</label>
                  <textarea
                    id="kb-desc"
                    className="kb-form-textarea"
                    placeholder="Ex: 'Assuntos relacionados à biologia do planeta'"
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                    required
                  />
                </div>

                <div className="kb-form-group">
                  <label htmlFor="kb-section">Seção / Categoria</label>
                  <select
                    id="kb-section"
                    className="kb-form-input"
                    value={newSection}
                    onChange={(e) => setNewSection(e.target.value)}
                  >
                    {KB_SECTIONS.map(sec => (
                      <option key={sec.id} value={sec.id}>{sec.icon} {sec.label}</option>
                    ))}
                  </select>
                </div>

                <div className="kb-form-group">
                  <label htmlFor="kb-tags">Tags de Autorização Obrigatória (separadas por vírgula)</label>
                  <input
                    id="kb-tags"
                    type="text"
                    className="kb-form-input"
                    placeholder="Guerra, Historia, Esportes"
                    value={newTags}
                    onChange={(e) => setNewTags(e.target.value)}
                  />
                </div>
              </div>

              <div className="kb-modal-footer">
                <button type="button" className="kb-btn-cancel" onClick={() => { setIsModalOpen(false); setEditingItem(null); }}>
                  Cancelar
                </button>
                <button type="submit" className="kb-btn-submit" disabled={!newTitle.trim() || !newDesc.trim()}>
                  {editingItem ? 'Salvar Alterações' : 'Adicionar Tema'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Unified Feedback Modal */}
      {feedback.isOpen && (
        <div className="kb-modal-overlay" onClick={() => setFeedback(prev => ({ ...prev, isOpen: false }))}>
          <div className="kb-modal confirm-modal" onClick={e => e.stopPropagation()}>
            <div className="kb-modal-header">
              <h2>
                <Sparkles size={20} color="var(--accent-cyan)" /> {feedback.title}
              </h2>
              <button className="kb-modal-close" onClick={() => setFeedback(prev => ({ ...prev, isOpen: false }))}>
                <X size={20} />
              </button>
            </div>
            <div className="kb-modal-body py-8 text-center px-6">
              <p className="text-lg mb-2">{feedback.message}</p>
              {feedback.type === 'confirm' && currentCompany?.sector && (
                <p className="text-sm text-muted">Ação para o setor: <strong className="text-cyan-400">{SECTOR_TEMPLATES[currentCompany.sector]?.label}</strong></p>
              )}
            </div>
            <div className="kb-modal-footer justify-center gap-4">
              {feedback.type === 'confirm' ? (
                <>
                  <button className="kb-btn-cancel px-8" onClick={() => setFeedback(prev => ({ ...prev, isOpen: false }))}>
                    Agora não
                  </button>
                  <button className="kb-btn-submit px-8" onClick={feedback.onConfirm}>
                    Sim, confirmar
                  </button>
                </>
              ) : (
                <button className="kb-btn-submit px-12" onClick={() => setFeedback(prev => ({ ...prev, isOpen: false }))}>
                  Entendi
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      {/* AI Suggestion Modal */}
      {aiSuggestion && (
        <div className="kb-modal-overlay">
          <div className="kb-modal ai-modal animate-slide-up" style={{ maxWidth: '600px' }}>
            <div className="kb-modal-header">
              <h2 className="flex items-center gap-2">
                <Sparkles size={22} color="var(--accent-cyan)" className="animate-pulse" />
                IA Analisou seu Arquivo
              </h2>
              <button className="kb-modal-close" onClick={() => setAiSuggestion(null)}>
                <X size={20} />
              </button>
            </div>
            <div className="kb-modal-body">
              <div className="ai-suggestion-badge">
                {aiSuggestion.action === 'merge' ? '🔄 Sugestão de Mesclagem' : '✨ Novo Conteúdo Identificado'}
              </div>
              
              <p className="ai-explanation mb-4 italic text-sm text-cyan-200">
                "{aiSuggestion.explanation}"
              </p>

              <div className="kb-form-group">
                <label>Título Sugerido</label>
                <div className="ai-preview-box">{aiSuggestion.suggested.title}</div>
              </div>

              <div className="kb-form-group">
                <label>Resumo Interpretado</label>
                <div className="ai-preview-box text-sm leading-relaxed">
                  {aiSuggestion.suggested.description}
                </div>
              </div>

              <div className="kb-grid-2">
                <div className="kb-form-group">
                  <label>Seção</label>
                  <div className="ai-preview-box">
                    {KB_SECTIONS.find(s => s.id === aiSuggestion.suggested.section)?.label || 'Geral'}
                  </div>
                </div>
                <div className="kb-form-group">
                  <label>Tags Identificadas</label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {aiSuggestion.suggested.tags.map(t => <span key={t} className="kb-tag text-[10px]">{t}</span>)}
                  </div>
                </div>
              </div>
            </div>
            <div className="kb-modal-footer">
              <button className="kb-btn-cancel" onClick={() => setAiSuggestion(null)}>Ignorar</button>
              <button className="kb-btn-submit" onClick={confirmAiSuggestion}>
                {aiSuggestion.action === 'merge' ? 'Mesclar Informações' : 'Confirmar e Criar TAG'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload Guide Modal */}
      {isUploadGuideOpen && (
        <div className="kb-modal-overlay" onClick={() => setIsUploadGuideOpen(false)}>
          <div className="kb-modal kb-guide-modal animate-slide-up" onClick={e => e.stopPropagation()} style={{ maxWidth: '650px' }}>
            <div className="kb-modal-header">
              <h2 className="flex items-center gap-2">
                <FileText size={20} color="var(--accent-cyan)" />
                Como preparar seu arquivo
              </h2>
              <button className="kb-modal-close" onClick={() => setIsUploadGuideOpen(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="kb-modal-body">
              <p className="text-sm text-muted mb-4">
                Para que a IA aprenda corretamente, seu arquivo CSV deve seguir a estrutura abaixo. 
                Certifique-se de usar os nomes das colunas exatamente como mostrado.
              </p>

              <div className="kb-guide-table-wrapper">
                <table className="kb-guide-table">
                  <thead>
                    <tr>
                      <th>Tema</th>
                      <th>Conteudo</th>
                      <th>Categoria</th>
                      <th>Tags</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Manual de Vendas</td>
                      <td>"A abordagem deve ser..."</td>
                      <td><span className="kb-guide-tag-blue">company_data</span></td>
                      <td>"vendas, script"</td>
                    </tr>
                    <tr>
                      <td>Reset de Senha</td>
                      <td>"Para resetar, acesse..."</td>
                      <td><span className="kb-guide-tag-blue">troubleshooting</span></td>
                      <td>"ajuda, login"</td>
                    </tr>
                    <tr>
                      <td>Politica de Frota</td>
                      <td>"O uso dos carros..."</td>
                      <td><span className="kb-guide-tag-blue">general</span></td>
                      <td>"regras, transporte"</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="kb-guide-info">
                <div className="kb-info-item">
                  <strong>Categorias permitidas:</strong>
                  <code>company_data</code>, <code>troubleshooting</code>, <code>general</code>
                </div>
                <div className="kb-info-item">
                  <strong>Dica:</strong> Salve como <code>.csv</code> (separado por vírgula) codificado em UTF-8.
                </div>
              </div>
            </div>
            <div className="kb-modal-footer">
              <a 
                href="/template_importacao_kabania.csv" 
                download 
                className="kb-btn-cancel flex items-center gap-2"
                onClick={(e) => {
                  // If path is wrong, we can just point to raw content or ignore
                  // For now, let's assume it's in public or accessible
                }}
              >
                <FileText size={16} /> Baixar Modelo
              </a>
              <button 
                className="kb-btn-submit flex items-center gap-2"
                onClick={() => {
                  setIsUploadGuideOpen(false);
                  fileInputRef.current?.click();
                }}
              >
                <CheckCircle size={16} /> Continuar para Upload
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
