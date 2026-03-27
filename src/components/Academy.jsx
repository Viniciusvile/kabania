import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import {
  GraduationCap, BookOpen, CheckCircle2, Circle, Plus, Edit3,
  Trash2, ChevronRight, ChevronLeft, Clock, Users, Award, X,
  Loader2, Search, Eye, EyeOff, ArrowLeft, Save, AlignLeft,
  BarChart2, Lock, Sparkles
} from 'lucide-react';
import './Academy.css';

const CATEGORIES = [
  { id: 'all', label: 'Todas', emoji: '📚' },
  { id: 'onboarding', label: 'Onboarding', emoji: '🚀' },
  { id: 'tecnico', label: 'Técnico', emoji: '🔧' },
  { id: 'compliance', label: 'Compliance', emoji: '✅' },
  { id: 'gestao', label: 'Gestão', emoji: '📊' },
  { id: 'geral', label: 'Geral', emoji: '🎓' },
];

const DEFAULT_MODULE_CONTENT = `## Título do Módulo

Escreva o conteúdo da aula aqui. Você pode usar **negrito**, *itálico*, listas:

- Item 1
- Item 2
- Item 3

### Pontos importantes

Descreva os pontos-chave deste módulo que o colaborador precisa dominar.

### Conclusão

Resumo do que foi aprendido nesta aula.`;

export default function Academy({ currentUser, currentCompany, userRole }) {
  const isAdmin = userRole === 'admin';
  const userEmail = currentUser?.email || '';

  // ---- State ----
  const [view, setView] = useState('catalog'); // 'catalog' | 'trail' | 'module'
  const [trails, setTrails] = useState([]);
  const [modules, setModules] = useState([]); // modules of selected trail
  const [progress, setProgress] = useState([]); // user progress
  const [loading, setLoading] = useState(true);
  const [selectedTrail, setSelectedTrail] = useState(null);
  const [selectedModule, setSelectedModule] = useState(null);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Modal state
  const [showTrailModal, setShowTrailModal] = useState(false);
  const [showModuleModal, setShowModuleModal] = useState(false);
  const [editingTrail, setEditingTrail] = useState(null);
  const [editingModule, setEditingModule] = useState(null);
  const [trailForm, setTrailForm] = useState({ title: '', description: '', category: 'onboarding', cover_emoji: '🚀', estimated_duration: 30 });
  const [moduleForm, setModuleForm] = useState({ title: '', content: DEFAULT_MODULE_CONTENT, order_index: 0 });
  const [saving, setSaving] = useState(false);
  const [completingModule, setCompletingModule] = useState(false);

  // ---- Data fetching ----
  const fetchTrails = async () => {
    if (!currentCompany?.id) { setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase
      .from('academy_trails')
      .select('*')
      .eq('company_id', currentCompany.id)
      .order('created_at', { ascending: false });
    setTrails(data || []);
    setLoading(false);
  };

  const fetchModules = async (trailId) => {
    const { data } = await supabase
      .from('academy_modules')
      .select('*')
      .eq('trail_id', trailId)
      .order('order_index', { ascending: true });
    setModules(data || []);
  };

  const fetchProgress = async () => {
    if (!userEmail || !currentCompany?.id) return;
    const { data } = await supabase
      .from('academy_progress')
      .select('*')
      .eq('user_email', userEmail)
      .eq('company_id', currentCompany.id);
    setProgress(data || []);
  };

  useEffect(() => {
    fetchTrails();
    fetchProgress();
  }, [currentCompany?.id]);

  useEffect(() => {
    if (selectedTrail) fetchModules(selectedTrail.id);
  }, [selectedTrail?.id]);

  // ---- Derived data ----
  const completedModuleIds = useMemo(() => new Set(progress.map(p => p.module_id)), [progress]);

  const trailCompletionRate = (trailId) => {
    const trailMods = modules.filter(m => m.trail_id === trailId);
    if (!trailMods.length) return 0;
    const done = trailMods.filter(m => completedModuleIds.has(m.id));
    return Math.round((done.length / trailMods.length) * 100);
  };

  const selectedTrailProgress = useMemo(() => {
    if (!selectedTrail || !modules.length) return 0;
    const done = modules.filter(m => completedModuleIds.has(m.id));
    return Math.round((done.length / modules.length) * 100);
  }, [modules, completedModuleIds, selectedTrail]);

  const filteredTrails = useMemo(() => {
    return trails.filter(t => {
      if (!isAdmin && !t.is_published) return false;
      if (categoryFilter !== 'all' && t.category !== categoryFilter) return false;
      if (searchTerm && !t.title.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      return true;
    });
  }, [trails, categoryFilter, searchTerm, isAdmin]);

  // ---- Trail CRUD ----
  const openNewTrail = () => {
    setEditingTrail(null);
    setTrailForm({ title: '', description: '', category: 'onboarding', cover_emoji: '🚀', estimated_duration: 30 });
    setShowTrailModal(true);
  };

  const openEditTrail = (trail) => {
    setEditingTrail(trail);
    setTrailForm({ title: trail.title, description: trail.description || '', category: trail.category, cover_emoji: trail.cover_emoji, estimated_duration: trail.estimated_duration });
    setShowTrailModal(true);
  };

  const handleSaveTrail = async () => {
    if (!trailForm.title.trim()) return;
    setSaving(true);
    const payload = { ...trailForm, company_id: currentCompany.id, created_by: userEmail };
    if (editingTrail) {
      await supabase.from('academy_trails').update(payload).eq('id', editingTrail.id);
    } else {
      await supabase.from('academy_trails').insert([payload]);
    }
    await fetchTrails();
    setSaving(false);
    setShowTrailModal(false);
  };

  const handleDeleteTrail = async (id) => {
    if (!window.confirm('Excluir esta trilha e todos os módulos?')) return;
    await supabase.from('academy_trails').delete().eq('id', id);
    if (selectedTrail?.id === id) { setSelectedTrail(null); setView('catalog'); }
    await fetchTrails();
  };

  const handleTogglePublish = async (trail) => {
    await supabase.from('academy_trails').update({ is_published: !trail.is_published }).eq('id', trail.id);
    setTrails(prev => prev.map(t => t.id === trail.id ? { ...t, is_published: !t.is_published } : t));
    if (selectedTrail?.id === trail.id) setSelectedTrail(prev => ({ ...prev, is_published: !prev.is_published }));
  };

  // ---- Module CRUD ----
  const openNewModule = () => {
    setEditingModule(null);
    setModuleForm({ title: '', content: DEFAULT_MODULE_CONTENT, order_index: modules.length });
    setShowModuleModal(true);
  };

  const openEditModule = (mod) => {
    setEditingModule(mod);
    setModuleForm({ title: mod.title, content: mod.content, order_index: mod.order_index });
    setShowModuleModal(true);
  };

  const handleSaveModule = async () => {
    if (!moduleForm.title.trim()) return;
    setSaving(true);
    const payload = { ...moduleForm, trail_id: selectedTrail.id, company_id: currentCompany.id };
    if (editingModule) {
      await supabase.from('academy_modules').update(payload).eq('id', editingModule.id);
    } else {
      await supabase.from('academy_modules').insert([payload]);
    }
    await fetchModules(selectedTrail.id);
    setSaving(false);
    setShowModuleModal(false);
  };

  const handleDeleteModule = async (id) => {
    if (!window.confirm('Excluir este módulo?')) return;
    await supabase.from('academy_modules').delete().eq('id', id);
    await fetchModules(selectedTrail.id);
    if (selectedModule?.id === id) { setSelectedModule(null); setView('trail'); }
  };

  // ---- Progress ----
  const handleCompleteModule = async (mod) => {
    if (completedModuleIds.has(mod.id)) return;
    setCompletingModule(true);
    const { error } = await supabase.from('academy_progress').insert([{
      user_email: userEmail,
      company_id: currentCompany.id,
      trail_id: selectedTrail.id,
      module_id: mod.id,
    }]);
    if (!error) await fetchProgress();
    setCompletingModule(false);
  };

  const handleUncompleteModule = async (modId) => {
    await supabase.from('academy_progress').delete()
      .eq('user_email', userEmail).eq('module_id', modId);
    await fetchProgress();
  };

  // ---- Navigation ----
  const openTrail = (trail) => {
    setSelectedTrail(trail);
    setSelectedModule(null);
    setView('trail');
  };

  const openModule = (mod) => {
    setSelectedModule(mod);
    setView('module');
  };

  const goToNextModule = () => {
    const idx = modules.findIndex(m => m.id === selectedModule?.id);
    if (idx < modules.length - 1) setSelectedModule(modules[idx + 1]);
  };

  const goToPrevModule = () => {
    const idx = modules.findIndex(m => m.id === selectedModule?.id);
    if (idx > 0) setSelectedModule(modules[idx - 1]);
  };

  const EMOJI_OPTIONS = ['🚀','🎓','🔧','📊','✅','💡','🏆','📋','🔑','🌟','🛡️','📝','🔍','⚙️','🎯'];

  // ---- Render ----
  return (
    <div className="academy-container animate-fade-in">

      {/* ===== CATALOG VIEW ===== */}
      {view === 'catalog' && (
        <>
          <header className="academy-header">
            <div className="academy-header-left">
              <div className="academy-badge">KABANIA ACADEMY</div>
              <h1>Trilhas de Treinamento</h1>
              <p>Desenvolva sua equipe com trilhas de onboarding e capacitação.</p>
            </div>
            <div className="academy-header-actions">
              {isAdmin && (
                <button className="academy-btn-primary" onClick={openNewTrail}>
                  <Plus size={16} /> Nova Trilha
                </button>
              )}
            </div>
          </header>

          {/* Category filter */}
          <div className="academy-filters">
            <div className="academy-search">
              <Search size={16} />
              <input
                type="text"
                placeholder="Buscar trilhas..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="academy-category-pills">
              {CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  className={`academy-pill ${categoryFilter === cat.id ? 'active' : ''}`}
                  onClick={() => setCategoryFilter(cat.id)}
                >
                  {cat.emoji} {cat.label}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="academy-loading">
              <Loader2 size={32} className="animate-spin" />
              <p>Carregando trilhas...</p>
            </div>
          ) : filteredTrails.length === 0 ? (
            <div className="academy-empty">
              <GraduationCap size={64} opacity={0.25} />
              <h3>Nenhuma trilha encontrada</h3>
              <p>{isAdmin ? 'Clique em "Nova Trilha" para criar a primeira trilha de treinamento.' : 'Aguarde seu administrador publicar as primeiras trilhas.'}</p>
            </div>
          ) : (
            <div className="academy-trail-grid">
              {filteredTrails.map(trail => {
                const catInfo = CATEGORIES.find(c => c.id === trail.category) || CATEGORIES[0];
                return (
                  <div key={trail.id} className={`academy-trail-card ${!trail.is_published ? 'draft' : ''}`} onClick={() => openTrail(trail)}>
                    <div className="academy-trail-cover">
                      <span className="academy-trail-emoji">{trail.cover_emoji || '🎓'}</span>
                      <div className="academy-trail-cover-overlay" />
                      {!trail.is_published && isAdmin && <div className="academy-draft-badge"><EyeOff size={11} /> Rascunho</div>}
                    </div>
                    <div className="academy-trail-body">
                      <div className="academy-trail-meta">
                        <span className="academy-cat-pill">{catInfo.emoji} {catInfo.label}</span>
                        <span className="academy-duration"><Clock size={12} /> {trail.estimated_duration}min</span>
                      </div>
                      <h3>{trail.title}</h3>
                      {trail.description && <p className="academy-trail-desc">{trail.description}</p>}
                      <div className="academy-trail-footer">
                        <div className="academy-progress-mini">
                          <div className="academy-progress-bar-shell">
                            <div className="academy-progress-bar-fill" style={{ width: '0%' }} />
                          </div>
                          <span>Iniciar</span>
                        </div>
                        <ChevronRight size={18} />
                      </div>
                    </div>
                    {isAdmin && (
                      <div className="academy-trail-admin-bar" onClick={e => e.stopPropagation()}>
                        <button title="Editar" onClick={() => openEditTrail(trail)}><Edit3 size={14} /></button>
                        <button title={trail.is_published ? 'Despublicar' : 'Publicar'} onClick={() => handleTogglePublish(trail)}>
                          {trail.is_published ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                        <button title="Excluir" className="danger" onClick={() => handleDeleteTrail(trail.id)}><Trash2 size={14} /></button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ===== TRAIL DETAIL VIEW ===== */}
      {view === 'trail' && selectedTrail && (
        <>
          <div className="academy-trail-header">
            <button className="academy-back-btn" onClick={() => setView('catalog')}>
              <ArrowLeft size={16} /> Voltar às Trilhas
            </button>
            {isAdmin && (
              <div className="academy-trail-admin-actions">
                <button className="academy-btn-ghost" onClick={() => openEditTrail(selectedTrail)}><Edit3 size={15} /> Editar</button>
                <button className={`academy-btn-ghost ${selectedTrail.is_published ? 'active' : ''}`} onClick={() => handleTogglePublish(selectedTrail)}>
                  {selectedTrail.is_published ? <><EyeOff size={15} /> Despublicar</> : <><Eye size={15} /> Publicar</>}
                </button>
                <button className="academy-btn-primary" onClick={openNewModule}><Plus size={15} /> Novo Módulo</button>
              </div>
            )}
          </div>

          <div className="academy-trail-detail">
            <div className="academy-trail-hero">
              <span className="academy-trail-hero-emoji">{selectedTrail.cover_emoji}</span>
              <div>
                <div className="academy-badge">{CATEGORIES.find(c => c.id === selectedTrail.category)?.label || 'Geral'}</div>
                <h1>{selectedTrail.title}</h1>
                {selectedTrail.description && <p>{selectedTrail.description}</p>}
                <div className="academy-trail-stats">
                  <span><Clock size={14} /> {selectedTrail.estimated_duration} min</span>
                  <span><AlignLeft size={14} /> {modules.length} módulos</span>
                  <span><BarChart2 size={14} /> {selectedTrailProgress}% concluído</span>
                </div>
              </div>
            </div>

            {/* Progress bar */}
            <div className="academy-trail-progress-card">
              <div className="academy-trail-progress-head">
                <span>Seu Progresso</span>
                <strong>{modules.filter(m => completedModuleIds.has(m.id)).length}/{modules.length} módulos</strong>
              </div>
              <div className="academy-progress-bar-shell large">
                <div className="academy-progress-bar-fill" style={{ width: `${selectedTrailProgress}%` }} />
              </div>
              {selectedTrailProgress === 100 && (
                <div className="academy-certificate-banner">
                  <Award size={20} />
                  <span>Parabéns! Você concluiu esta trilha. <strong>🏆 Certificado disponível!</strong></span>
                </div>
              )}
            </div>

            {/* Module list */}
            <div className="academy-modules-list">
              {modules.length === 0 ? (
                <div className="academy-empty-modules">
                  <BookOpen size={48} opacity={0.25} />
                  <p>{isAdmin ? 'Clique em "Novo Módulo" para adicionar o primeiro conteúdo.' : 'Nenhum módulo adicionado ainda.'}</p>
                </div>
              ) : (
                modules.map((mod, idx) => {
                  const isDone = completedModuleIds.has(mod.id);
                  return (
                    <div key={mod.id} className={`academy-module-row ${isDone ? 'done' : ''}`}>
                      <div className="academy-module-number">
                        {isDone
                          ? <CheckCircle2 size={22} className="academy-check-done" />
                          : <span>{idx + 1}</span>}
                      </div>
                      <div className="academy-module-info" onClick={() => openModule(mod)}>
                        <h4>{mod.title}</h4>
                        <span>{mod.content.slice(0, 80).replace(/[#*]/g, '').trim()}…</span>
                      </div>
                      <div className="academy-module-actions">
                        {isDone
                          ? <span className="academy-done-label"><CheckCircle2 size={14} /> Concluído</span>
                          : <button className="academy-start-btn" onClick={() => openModule(mod)}>Iniciar <ChevronRight size={14} /></button>}
                        {isAdmin && (
                          <>
                            <button title="Editar" onClick={() => openEditModule(mod)}><Edit3 size={14} /></button>
                            <button title="Excluir" className="danger" onClick={() => handleDeleteModule(mod.id)}><Trash2 size={14} /></button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}

      {/* ===== MODULE READER VIEW ===== */}
      {view === 'module' && selectedModule && (
        <div className="academy-reader">
          <div className="academy-reader-sidebar">
            <button className="academy-back-btn" onClick={() => setView('trail')}>
              <ArrowLeft size={15} /> {selectedTrail?.title}
            </button>
            <div className="academy-reader-progress">
              <span>{modules.filter(m => completedModuleIds.has(m.id)).length}/{modules.length}</span>
              <div className="academy-progress-bar-shell">
                <div className="academy-progress-bar-fill" style={{ width: `${selectedTrailProgress}%` }} />
              </div>
            </div>
            <div className="academy-reader-module-list">
              {modules.map((mod, idx) => {
                const isDone = completedModuleIds.has(mod.id);
                const isCurrent = mod.id === selectedModule.id;
                return (
                  <div key={mod.id} className={`academy-reader-module-item ${isCurrent ? 'current' : ''} ${isDone ? 'done' : ''}`} onClick={() => setSelectedModule(mod)}>
                    <span className="academy-reader-module-num">
                      {isDone ? <CheckCircle2 size={16} /> : <span>{idx + 1}</span>}
                    </span>
                    <span>{mod.title}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="academy-reader-content">
            <div className="academy-reader-header">
              <h2>{selectedModule.title}</h2>
              {isAdmin && (
                <button className="academy-btn-ghost" onClick={() => openEditModule(selectedModule)}><Edit3 size={15} /> Editar</button>
              )}
            </div>
            <div className="academy-reader-body">
              {/* Markdown-like rendering */}
              {selectedModule.content.split('\n').map((line, i) => {
                if (line.startsWith('### ')) return <h3 key={i}>{line.slice(4)}</h3>;
                if (line.startsWith('## ')) return <h2 key={i}>{line.slice(3)}</h2>;
                if (line.startsWith('# ')) return <h1 key={i}>{line.slice(2)}</h1>;
                if (line.startsWith('- ')) return <li key={i}>{line.slice(2).replace(/\*\*(.*?)\*\*/g, '$1')}</li>;
                if (line.trim() === '') return <br key={i} />;
                return <p key={i}>{line.replace(/\*\*(.*?)\*\*/g, (_, t) => t)}</p>;
              })}
            </div>
            <div className="academy-reader-footer">
              <button className="academy-btn-ghost" onClick={goToPrevModule} disabled={modules.findIndex(m => m.id === selectedModule.id) === 0}>
                <ChevronLeft size={16} /> Anterior
              </button>

              {completedModuleIds.has(selectedModule.id) ? (
                <button className="academy-btn-done" onClick={() => handleUncompleteModule(selectedModule.id)}>
                  <CheckCircle2 size={16} /> Concluído — Desfazer
                </button>
              ) : (
                <button className="academy-btn-complete" onClick={() => handleCompleteModule(selectedModule)} disabled={completingModule}>
                  {completingModule ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                  Marcar como Concluído
                </button>
              )}

              <button className="academy-btn-ghost" onClick={goToNextModule} disabled={modules.findIndex(m => m.id === selectedModule.id) === modules.length - 1}>
                Próximo <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== TRAIL MODAL ===== */}
      {showTrailModal && isAdmin && (
        <div className="academy-modal-overlay" onClick={() => setShowTrailModal(false)}>
          <div className="academy-modal" onClick={e => e.stopPropagation()}>
            <div className="academy-modal-header">
              <h2><GraduationCap size={20} /> {editingTrail ? 'Editar Trilha' : 'Nova Trilha'}</h2>
              <button onClick={() => setShowTrailModal(false)}><X size={20} /></button>
            </div>
            <div className="academy-modal-body">
              <div className="academy-form-field">
                <label>Emoji da Trilha</label>
                <div className="academy-emoji-picker">
                  {EMOJI_OPTIONS.map(em => (
                    <button key={em} className={`academy-emoji-btn ${trailForm.cover_emoji === em ? 'selected' : ''}`} onClick={() => setTrailForm(p => ({ ...p, cover_emoji: em }))}>
                      {em}
                    </button>
                  ))}
                </div>
              </div>
              <div className="academy-form-field">
                <label>Título *</label>
                <input type="text" placeholder="Ex: Onboarding de Novos Colaboradores" value={trailForm.title} onChange={e => setTrailForm(p => ({ ...p, title: e.target.value }))} />
              </div>
              <div className="academy-form-field">
                <label>Descrição</label>
                <textarea rows={3} placeholder="O que o colaborador aprenderá nesta trilha..." value={trailForm.description} onChange={e => setTrailForm(p => ({ ...p, description: e.target.value }))} />
              </div>
              <div className="academy-form-row">
                <div className="academy-form-field">
                  <label>Categoria</label>
                  <select value={trailForm.category} onChange={e => setTrailForm(p => ({ ...p, category: e.target.value }))}>
                    {CATEGORIES.filter(c => c.id !== 'all').map(c => <option key={c.id} value={c.id}>{c.emoji} {c.label}</option>)}
                  </select>
                </div>
                <div className="academy-form-field">
                  <label>Duração estimada (min)</label>
                  <input type="number" min="5" max="600" value={trailForm.estimated_duration} onChange={e => setTrailForm(p => ({ ...p, estimated_duration: Number(e.target.value) }))} />
                </div>
              </div>
            </div>
            <div className="academy-modal-footer">
              <button className="academy-btn-ghost" onClick={() => setShowTrailModal(false)}>Cancelar</button>
              <button className="academy-btn-primary" onClick={handleSaveTrail} disabled={!trailForm.title.trim() || saving}>
                {saving ? <><Loader2 size={14} className="animate-spin" /> Salvando...</> : editingTrail ? 'Salvar Alterações' : 'Criar Trilha'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== MODULE MODAL ===== */}
      {showModuleModal && isAdmin && (
        <div className="academy-modal-overlay" onClick={() => setShowModuleModal(false)}>
          <div className="academy-modal academy-modal-lg" onClick={e => e.stopPropagation()}>
            <div className="academy-modal-header">
              <h2><BookOpen size={20} /> {editingModule ? 'Editar Módulo' : 'Novo Módulo'}</h2>
              <button onClick={() => setShowModuleModal(false)}><X size={20} /></button>
            </div>
            <div className="academy-modal-body">
              <div className="academy-form-field">
                <label>Título do Módulo *</label>
                <input type="text" placeholder="Ex: Apresentação da Empresa" value={moduleForm.title} onChange={e => setModuleForm(p => ({ ...p, title: e.target.value }))} />
              </div>
              <div className="academy-form-field">
                <label>Conteúdo da Aula (Markdown)</label>
                <textarea
                  className="academy-content-editor"
                  rows={14}
                  value={moduleForm.content}
                  onChange={e => setModuleForm(p => ({ ...p, content: e.target.value }))}
                  placeholder="Escreva o conteúdo da aula aqui..."
                />
              </div>
              <div className="academy-form-field">
                <label>Ordem</label>
                <input type="number" min="0" value={moduleForm.order_index} onChange={e => setModuleForm(p => ({ ...p, order_index: Number(e.target.value) }))} />
              </div>
            </div>
            <div className="academy-modal-footer">
              <button className="academy-btn-ghost" onClick={() => setShowModuleModal(false)}>Cancelar</button>
              <button className="academy-btn-primary" onClick={handleSaveModule} disabled={!moduleForm.title.trim() || saving}>
                {saving ? <><Loader2 size={14} className="animate-spin" /> Salvando...</> : editingModule ? 'Salvar Alterações' : 'Criar Módulo'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
