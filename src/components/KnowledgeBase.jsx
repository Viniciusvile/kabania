import React, { useState, useEffect } from 'react';
import { BookOpen, Database, FileText, CheckCircle, Search, ToggleRight, ToggleLeft, Plus, X, Trash2, Edit2 } from 'lucide-react';
import './KnowledgeBase.css';

export default function KnowledgeBase({ currentUser }) {
  const getStorageKey = () => {
    return currentUser ? `synapseKnowledgeState_${currentUser}` : 'synapseKnowledgeState_default';
  };

  // Initial demo data for the knowledge base
  const [knowledgeItems, setKnowledgeItems] = useState(() => {
    const saved = localStorage.getItem(getStorageKey());
    if (saved) {
      return JSON.parse(saved);
    }
    return [];
  });

  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal states for adding new item
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newTags, setNewTags] = useState('');
  const [editingItem, setEditingItem] = useState(null);

  // Update items when user changes
  useEffect(() => {
    const saved = localStorage.getItem(getStorageKey());
    if (saved) {
      setKnowledgeItems(JSON.parse(saved));
    } else {
      // Load defaults for new users
      setKnowledgeItems([]);
    }
  }, [currentUser]);

  // Persist toggles to localStorage so GeminiService can read it
  useEffect(() => {
    localStorage.setItem(getStorageKey(), JSON.stringify(knowledgeItems));
  }, [knowledgeItems, currentUser]);

  const toggleItem = (id) => {
    setKnowledgeItems(prev => prev.map(item => 
      item.id === id ? { ...item, enabled: !item.enabled } : item
    ));
  };

  const deleteItem = (id) => {
    setKnowledgeItems(prev => prev.filter(item => item.id !== id));
  };

  const handleEdit = (item) => {
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

  const handleAddNew = (e) => {
    e.preventDefault();
    if (!newTitle.trim() || !newDesc.trim()) return;

    const parsedTags = newTags
      .split(',')
      .map(t => t.trim())
      .filter(t => t.length > 0);

    if (editingItem) {
      setKnowledgeItems(prev => prev.map(item => 
        item.id === editingItem.id 
          ? { ...item, title: newTitle.trim(), description: newDesc.trim(), tags: parsedTags.length > 0 ? parsedTags : item.tags }
          : item
      ));
    } else {
      const newItem = {
        id: `kb-${Date.now()}`,
        title: newTitle.trim(),
        description: newDesc.trim(),
        enabled: true, // Automatically active when added
        type: 'document',
        tags: parsedTags.length > 0 ? parsedTags : ['Adicionado Manualmente']
      };
      setKnowledgeItems(prev => [newItem, ...prev]);
    }
    
    // Reset and close
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
          Ative ou desative os temas autorizados abaixo. A Inteligência Artificial operará mediante regras rígidas de TAGS: Só responderá às suas perguntas se o tema possuir uma das TAGS cadastradas e ativas aqui na base. Caso não exista tag, ela será bloqueada.
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
        <button className="kb-btn-add" onClick={() => { setEditingItem(null); setIsModalOpen(true); }}>
          <Plus size={18} /> Conectar Nova Fonte
        </button>
      </div>

      <div className="kb-grid">
        {filteredItems.map(item => (
          <div 
            key={item.id} 
            className={`kb-card ${item.enabled ? 'enabled' : 'disabled'}`}
          >
            <div className="kb-card-header">
              <div className="kb-icon-wrapper">
                {getIconForType(item.type)}
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => handleEdit(item)}
                  className="kb-delete-btn"
                  title="Editar Fonte"
                  style={{ color: 'var(--text-muted)' }}
                >
                  <Edit2 size={16} />
                </button>
                <button 
                  onClick={() => deleteItem(item.id)}
                  className="kb-delete-btn"
                  title="Excluir Fonte"
                >
                  <Trash2 size={16} />
                </button>
                <button 
                  onClick={() => toggleItem(item.id)}
                  className={`kb-toggle-btn ${item.enabled ? 'active' : 'inactive'}`}
                  title={item.enabled ? "Desativar" : "Ativar"}
                >
                  {item.enabled ? <ToggleRight size={32} /> : <ToggleLeft size={32} />}
                </button>
              </div>
            </div>
            
            <h3 className="kb-card-title">
              {item.title}
            </h3>
            
            <p className="kb-card-desc">
              {item.description}
            </p>
            
            <div className="kb-card-footer">
              <div className="kb-tags">
                {item.tags.map(tag => (
                  <span key={tag} className="kb-tag">
                    {tag}
                  </span>
                ))}
              </div>
              <div className="kb-status-wrapper">
                {item.enabled ? (
                  <span className="kb-status active"><CheckCircle size={14} /> Ativo no Contexto</span>
                ) : (
                  <span className="kb-status inactive">Inativo</span>
                )}
              </div>
            </div>
          </div>
        ))}

        {filteredItems.length === 0 && (
          <div className="kb-empty">
            Nenhuma fonte de conhecimento encontrada com esse nome.
          </div>
        )}
      </div>

      {isModalOpen && (
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
                    placeholder="Ex: 'Assuntos relacionados à biologia do planeta' (Nota: o conteúdo servirá apenas para sua organização, a IA operará baseada nas TAGS)."
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
