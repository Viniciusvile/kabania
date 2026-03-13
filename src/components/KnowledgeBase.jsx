import React, { useState, useEffect } from 'react';
import { BookOpen, Database, FileText, CheckCircle, Search, ToggleRight, ToggleLeft, Plus, X, Trash2, Edit2, Lock, Sparkles } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { SECTOR_TEMPLATES } from './CompanySetup';
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

  const handleLoadTemplates = async () => {
    if (!isAdmin || !currentCompany?.sector || !SECTOR_TEMPLATES[currentCompany.sector]) return;
    
    if (!window.confirm(`Deseja carregar as tags sugeridas para o setor: ${SECTOR_TEMPLATES[currentCompany.sector].label}?`)) return;

    setLoading(true);
    const template = SECTOR_TEMPLATES[currentCompany.sector];
    const newItem = {
      id: `kb-init-${Date.now()}`,
      title: `Base de Autorizações: ${template.label}`,
      description: `Configuração sugerida para o setor de ${template.label}.`,
      enabled: true,
      type: 'document',
      tags: template.tags,
      company_id: currentCompany.id,
      created_at: new Date().toISOString()
    };

    const { error } = await supabase.from('knowledge_base').insert([newItem]);
    if (!error) {
      setKnowledgeItems(prev => [newItem, ...prev]);
    } else {
      alert('Erro ao carregar templates.');
    }
    setLoading(false);
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
        {isAdmin && (
          <button className="kb-btn-add" onClick={() => { setEditingItem(null); setIsModalOpen(true); }}>
            <Plus size={18} /> Conectar Nova Fonte
          </button>
        )}
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
    </div>
  );
}
