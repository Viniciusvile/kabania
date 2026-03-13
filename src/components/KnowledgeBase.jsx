import React, { useState, useEffect } from 'react';
import { BookOpen, Database, FileText, CheckCircle, Search, ToggleRight, ToggleLeft, Plus, X, Trash2, Edit2, Lock, Sparkles } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { SECTOR_TEMPLATES } from './CompanySetup';
import { logEvent } from '../services/historyService';
import './KnowledgeBase.css';

export default function KnowledgeBase({ currentUser, currentCompany, userRole }) {
  const isAdmin = userRole === 'admin';

  const [knowledgeItems, setKnowledgeItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newTags, setNewTags] = useState('');
  const [editingItem, setEditingItem] = useState(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  // Fetch from Supabase
  useEffect(() => {
    const fetchKnowledge = async () => {
      if (!currentCompany?.id) {
        setLoading(false);
        return;
      }
      setLoading(true);
      const { data, error } = await supabase
        .from('knowledge_base')
        .select('*')
        .eq('company_id', currentCompany.id)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setKnowledgeItems(data);
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

    const { error } = await supabase
      .from('knowledge_base')
      .update({ enabled: !item.enabled })
      .eq('id', id);

    if (!error) {
      setKnowledgeItems(prev => prev.map(it =>
        it.id === id ? { ...it, enabled: !item.enabled } : it
      ));
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
    setIsConfirmOpen(true);
  };

  const confirmLoadTemplates = async () => {
    setIsConfirmOpen(false);
    setLoading(true);
    try {
      const template = SECTOR_TEMPLATES[currentCompany.sector];
      
      // 1. Define global defaults
      const globalDefaults = [
        { title: 'Histórico da Empresa', desc: 'Dados sobre fundação, valores e cultura corporativa.', type: 'document', tag: 'Histórico' },
        { title: 'Políticas e Regras', desc: 'Regimento interno, normas de conduta e horários.', type: 'file', tag: 'Regras' },
        { title: 'Base de Conhecimento Geral', desc: 'Informações gerais de suporte e FAQ do time.', type: 'database', tag: 'Geral' }
      ];

      // 2. Prepare items, but FILTER OUT those that already exist by title
      const existingTitles = new Set(knowledgeItems.map(it => it.title));
      const timestamp = Date.now();
      
      const potentialItems = [
        ...globalDefaults.map((d, i) => ({
          id: `kb-def-${timestamp}-${i}-${Math.random().toString(36).substr(2, 5)}`,
          company_id: currentCompany.id,
          title: d.title,
          description: d.desc,
          enabled: true,
          type: d.type,
          tags: [d.tag]
        })),
        ...template.tags.map((tag, idx) => ({
          id: `kb-sec-${timestamp}-${idx}-${Math.random().toString(36).substr(2, 5)}`,
          company_id: currentCompany.id,
          title: tag,
          description: `Assunto autorizado: ${tag} (${template.label})`,
          enabled: true,
          type: 'document',
          tags: [tag]
        }))
      ];

      const itemsToInsert = potentialItems.filter(item => !existingTitles.has(item.title));

      if (itemsToInsert.length === 0) {
        alert('Todos os temas deste preset já estão presentes na sua base.');
        setLoading(false);
        return;
      }

      const { data, error } = await supabase.from('knowledge_base').insert(itemsToInsert).select();
      
      if (!error) {
        setKnowledgeItems(prev => [...(data || itemsToInsert), ...prev]);
        logEvent(currentCompany.id, currentUser, 'LOAD_KB_TEMPLATES', `Carregada lista presetada de ${itemsToInsert.length} temas para o setor ${template.label}.`);
      } else {
        console.error('Supabase error detail:', error);
        alert(`Erro ao salvar no banco: ${error.message || 'Verifique sua conexão ou permissões.'}`);
      }
    } catch (err) {
      console.error('Crash in handleLoadTemplates:', err);
      alert('Ocorreu um erro inesperado ao processar os temas.');
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
        tags: parsedTags.length > 0 ? parsedTags : editingItem.tags
      };

      const { error } = await supabase
        .from('knowledge_base')
        .update(payload)
        .eq('id', editingItem.id);

      if (!error) {
        setKnowledgeItems(prev => prev.map(item =>
          item.id === editingItem.id ? { ...item, ...payload } : item
        ));
      }
    } else {
      const newItem = {
        id: `kb-${Date.now()}`,
        title: newTitle.trim(),
        description: newDesc.trim(),
        enabled: true,
        type: 'document',
        tags: parsedTags.length > 0 ? parsedTags : ['Adicionado Manualmente'],
        company_id: currentCompany?.id
      };

      const { error } = await supabase
        .from('knowledge_base')
        .insert([newItem]);

      if (!error) {
        setKnowledgeItems(prev => [newItem, ...prev]);
      }
    }

    setNewTitle('');
    setNewDesc('');
    setNewTags('');
    setEditingItem(null);
    setIsModalOpen(false);
  };

  return (
    <div className="knowledge-base-container animate-fade-in">
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
        <div className="flex gap-2">
          {isAdmin && currentCompany?.sector && SECTOR_TEMPLATES[currentCompany.sector] && (
            <button className="kb-btn-template" onClick={handleLoadTemplates} title="Recarregar temas padrão do setor">
              <Sparkles size={18} /> Restaurar Preset
            </button>
          )}
          {isAdmin && (
            <button className="kb-btn-add" onClick={() => { setEditingItem(null); setIsModalOpen(true); }}>
              <Plus size={18} /> Conectar Nova Fonte
            </button>
          )}
        </div>
      </div>

      <div className="kb-grid">
        {filteredItems.map(item => (
          <div key={item.id} className={`kb-card ${item.enabled ? 'enabled' : 'disabled'}`}>
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
          </div>
        ))}

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

      {/* Custom Confirmation Modal for Presets */}
      {isConfirmOpen && (
        <div className="kb-modal-overlay" onClick={() => setIsConfirmOpen(false)}>
          <div className="kb-modal confirm-modal" onClick={e => e.stopPropagation()}>
            <div className="kb-modal-header">
              <h2>
                <Sparkles size={20} color="var(--accent-cyan)" /> Confirmar Restauração
              </h2>
              <button className="kb-modal-close" onClick={() => setIsConfirmOpen(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="kb-modal-body py-8 text-center">
              <p className="text-lg mb-2">Deseja carregar a lista presetada de sugestões?</p>
              <p className="text-sm text-muted">Ação para o setor: <strong className="text-cyan-400">{SECTOR_TEMPLATES[currentCompany.sector]?.label}</strong></p>
              <p className="text-xs mt-4 opacity-50 italic">Isso adicionará novos temas de autorização à sua base atual.</p>
            </div>
            <div className="kb-modal-footer justify-center gap-4">
              <button className="kb-btn-cancel px-8" onClick={() => setIsConfirmOpen(false)}>
                Agora não
              </button>
              <button className="kb-btn-submit px-8" onClick={confirmLoadTemplates}>
                Sim, carregar temas
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
