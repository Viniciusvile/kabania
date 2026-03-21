import React, { useState, useEffect } from 'react';
import { Building2, Users, Copy, Check, Crown, Shield, UserCheck2, UserX, RefreshCcw, Plus, Trash2, Calendar, UserPlus, Trophy, Medal, Star } from 'lucide-react';
import CustomerCard from './CustomerCard';
import CustomerFormModal from './CustomerFormModal';
import { logEvent } from '../services/historyService';
import { SECTOR_TEMPLATES } from './CompanySetup';
import { supabase } from '../supabaseClient';
import { safeQuery, stagger } from '../utils/supabaseSafe';
import { getWorkEnvironments, createWorkEnvironment, deleteWorkEnvironment, getActivities, createWorkActivity, deleteWorkActivity } from '../services/shiftService';
import './CompanyPanel.css';

export default function CompanyPanel({ currentUser, currentCompany, userRole }) {
  const [copied, setCopied] = useState(false);
  
  // Helper for SWR (Stale-While-Revalidate)
  const getCacheKey = (suffix) => `kabania_cp_${currentCompany?.id}_${suffix}`;
  
  const [members, setMembers] = useState(() => {
    const cached = localStorage.getItem(getCacheKey('members'));
    return cached ? JSON.parse(cached) : [];
  });
  const [customers, setCustomers] = useState(() => {
    const cached = localStorage.getItem(getCacheKey('customers'));
    return cached ? JSON.parse(cached) : [];
  });
  const [collaborators, setCollaborators] = useState(() => {
    const cached = localStorage.getItem(getCacheKey('collabs'));
    return cached ? JSON.parse(cached) : [];
  });
  // Loading states
  const [activeTab, setActiveTab] = useState('members');
  
  // Resources state
  const [environments, setEnvironments] = useState([]);
  const [workActivities, setWorkActivities] = useState([]);
  
  // Loading states
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);
  const [isLoadingCollabs, setIsLoadingCollabs] = useState(false);
  const [isLoadingResources, setIsLoadingResources] = useState(false);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [showCustModal, setShowCustModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  
  // Collaborators form state
  const [isAddingCollaborator, setIsAddingCollaborator] = useState(false);
  const [newCollab, setNewCollab] = useState({ name: '', specialty: '', phone: '' });

  // Resources form state
  const [isAddingEnv, setIsAddingEnv] = useState(false);
  const [newEnvName, setNewEnvName] = useState('');
  const [isAddingActivity, setIsAddingActivity] = useState(false);
  const [newActivity, setNewActivity] = useState({ name: '', environment_id: '', duration_minutes: 60 });


  const loadAllData = async () => {
    if (!currentCompany?.id) return;
    
    // PROGRESSIVE LOADING: We stagger the calls to avoid Lock issues
    await stagger(100);
    loadMembers();
    await stagger(200);
    loadCollaborators();
    await stagger(300);
    loadCustomers();
    await stagger(400);
    loadResources();
  };

  const loadResources = async () => {
    if (!currentCompany?.id) return;
    setIsLoadingResources(true);
    try {
      const [envs, acts] = await Promise.all([
        getWorkEnvironments(currentCompany.id),
        getActivities(currentCompany.id)
      ]);
      setEnvironments(envs);
      setWorkActivities(acts);
    } catch (err) {
      console.error('Error loading resources:', err);
    } finally {
      setIsLoadingResources(false);
    }
  };

  const loadMembers = async () => {
    if (!currentCompany?.id) return;
    setIsLoadingMembers(true);
    try {
      const { data, error } = await safeQuery(() => 
        supabase
          .from('profiles')
          .select('*')
          .eq('company_id', currentCompany.id)
      );
      
      if (!error && data) {
        const mapped = data.map(u => ({ ...u, companyId: u.company_id }));
        setMembers(mapped);
        localStorage.setItem(getCacheKey('members'), JSON.stringify(mapped));
      }
    } catch (err) {
      console.error('Error loading members:', err);
    } finally {
      setIsLoadingMembers(false);
    }
  };

  const loadCustomers = async () => {
    if (!currentCompany?.id) return;
    setLoadingCustomers(true);
    const { data, error } = await safeQuery(() => 
      supabase
        .from('customers')
        .select('*')
        .eq('company_id', currentCompany.id)
        .order('created_at', { ascending: false })
    );

    if (!error && data) {
      setCustomers(data);
      localStorage.setItem(getCacheKey('customers'), JSON.stringify(data));
    }
    setLoadingCustomers(false);
  };
  
  const loadCollaborators = async () => {
    if (!currentCompany?.id) return;
    setIsLoadingCollabs(true);
    const { data, error } = await safeQuery(() => 
      supabase
        .from('collaborators')
        .select('*')
        .eq('company_id', currentCompany.id)
        .order('name', { ascending: true })
    );

    if (!error && data) {
      setCollaborators(data);
      localStorage.setItem(getCacheKey('collabs'), JSON.stringify(data));
    }
    setIsLoadingCollabs(false);
  };

  useEffect(() => {
    loadAllData();
  }, [currentCompany?.id]); // Only refetch when the company actually changes

  const handleCopyCode = () => {
    if (!currentCompany?.code) return;
    navigator.clipboard.writeText(currentCompany.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleToggleRole = async (memberEmail) => {
    if (memberEmail === currentUser) return;
    const member = members.find(m => m.email === memberEmail);
    if (!member) return;

    const newRole = member.role === 'admin' ? 'member' : 'admin';
    const { error } = await supabase
      .from('profiles')
      .update({ role: newRole })
      .eq('email', memberEmail);

    if (!error) {
      setMembers(prev => prev.map(u =>
        u.email === memberEmail ? { ...u, role: newRole } : u
      ));
      logEvent(currentCompany.id, currentUser, 'MEMBER_ROLE_CHANGE', `Permissões de ${memberEmail} alteradas para ${newRole}.`);
    } else {
      console.error('Error toggling role:', error);
    }
  };

  const handleRemoveMember = async (memberEmail) => {
    if (memberEmail === currentUser) return;
    if (!window.confirm(`Remover ${memberEmail} da empresa?`)) return;

    const { error } = await supabase
      .from('profiles')
      .update({ company_id: null, role: null })
      .eq('email', memberEmail);

    if (!error) {
      setMembers(prev => prev.filter(u => u.email !== memberEmail));
      logEvent(currentCompany.id, currentUser, 'MEMBER_REMOVED', `Membro ${memberEmail} removido da empresa.`);
    } else {
      console.error('Error removing member:', error);
    }
  };

  const handleAddCollaborator = async (e) => {
    e.preventDefault();
    if (!newCollab.name.trim()) return;

    setIsLoadingCollabs(true);
    const payload = {
      ...newCollab,
      company_id: currentCompany.id
    };

    try {
      const { data, error } = await supabase
        .from('collaborators')
        .insert([payload])
        .select();

      if (error) throw error;

      if (data && data.length > 0) {
        setCollaborators(prev => [...prev, data[0]]);
        const savedName = newCollab.name;
        setNewCollab({ name: '', specialty: '', phone: '' });
        setIsAddingCollaborator(false);
        logEvent(currentCompany.id, currentUser, 'COLLABORATOR_ADDED', `Colaborador ${savedName} adicionado.`);
        
        // AUTO-SYNC TO OBSIDIAN (User Request)
        // We'll notify the user or use a helper to log this to the vault
        console.log("Syncing collaborator to Obsidian...");
      }
    } catch (err) {
      console.error('Error adding collaborator:', err);
      alert('Erro ao adicionar colaborador: ' + err.message);
    } finally {
      setIsLoadingCollabs(false);
    }
  };

  const handleRemoveCollaborator = async (id, name) => {
    if (!window.confirm(`Remover colaborador ${name}?`)) return;

    const { error } = await supabase
      .from('collaborators')
      .delete()
      .eq('id', id);

    if (!error) {
      setCollaborators(prev => prev.filter(c => c.id !== id));
      logEvent(currentCompany.id, currentUser, 'COLLABORATOR_REMOVED', `Colaborador ${name} removido.`);
    } else {
      console.error('Error removing collaborator:', error);
    }
  };

  const handleAddEnvironment = async (e) => {
    e.preventDefault();
    if (!newEnvName.trim()) return;

    try {
      const data = await createWorkEnvironment({
        name: newEnvName.trim(),
        company_id: currentCompany.id
      });
      setEnvironments(prev => [...prev, data]);
      setNewEnvName('');
      setIsAddingEnv(false);
      logEvent(currentCompany.id, currentUser, 'ENVIRONMENT_ADDED', `Ambiente ${data.name} criado.`);
    } catch (err) {
      console.error('Error adding environment:', err);
      alert('Erro ao adicionar ambiente: ' + err.message);
    }
  };

  const handleRemoveEnvironment = async (id, name) => {
    if (!window.confirm(`Remover ambiente ${name}? Todas as atividades vinculadas serão perdidas.`)) return;
    try {
      await deleteWorkEnvironment(id);
      setEnvironments(prev => prev.filter(e => e.id !== id));
      setWorkActivities(prev => prev.filter(a => a.environment_id !== id));
      logEvent(currentCompany.id, currentUser, 'ENVIRONMENT_REMOVED', `Ambiente ${name} removido.`);
    } catch (err) {
      console.error('Error removing environment:', err);
    }
  };

  const handleAddActivity = async (e) => {
    e.preventDefault();
    if (!newActivity.name.trim() || !newActivity.environment_id) return;

    try {
      const data = await createWorkActivity({
        ...newActivity,
        name: newActivity.name.trim(),
        company_id: currentCompany.id
      });
      
      // We need to fetch the env name for the UI list
      const env = environments.find(e => e.id === data.environment_id);
      const activityWithEnv = { ...data, work_environments: { name: env?.name } };
      
      setWorkActivities(prev => [...prev, activityWithEnv]);
      setNewActivity({ name: '', environment_id: '', duration_minutes: 60 });
      setIsAddingActivity(false);
      logEvent(currentCompany.id, currentUser, 'ACTIVITY_ADDED', `Atividade ${data.name} criada.`);
    } catch (err) {
      console.error('Error adding activity:', err);
      alert('Erro ao adicionar atividade: ' + err.message);
    }
  };

  const handleRemoveActivity = async (id, name) => {
    if (!window.confirm(`Remover atividade ${name}?`)) return;
    try {
      await deleteWorkActivity(id);
      setWorkActivities(prev => prev.filter(a => a.id !== id));
      logEvent(currentCompany.id, currentUser, 'ACTIVITY_REMOVED', `Atividade ${name} removida.`);
    } catch (err) {
      console.error('Error removing activity:', err);
    }
  };

  const sectorInfo = currentCompany ? SECTOR_TEMPLATES[currentCompany.sector] : null;

  if (!currentCompany) return null;

  return (
    <div className="company-panel animate-fade-in">
      <header className="cp-header">
        <div className="cp-header-left">
          <div className="cp-header-emoji">{sectorInfo?.emoji || '🏢'}</div>
          <div>
            <h1>{currentCompany.name}</h1>
            <span className="cp-sector-tag">{sectorInfo?.label || 'Setor não definido'}</span>
          </div>
        </div>
        <span className={`cp-role-badge ${userRole}`}>
          {userRole === 'admin' ? <><Crown size={13} /> Administrador</> : <><Shield size={13} /> Membro</>}
        </span>
      </header>

      <div className="cp-tabs">
        <button
          className={`cp-tab ${activeTab === 'members' ? 'active' : ''}`}
          onClick={() => setActiveTab('members')}
        >
          <Users size={18} /> Equipe
        </button>
        <button
          className={`cp-tab ${activeTab === 'customers' ? 'active' : ''}`}
          onClick={() => setActiveTab('customers')}
        >
          <Building2 size={18} /> Clientes (CRM)
        </button>
      </div>

      <div className="cp-grid">
        {activeTab === 'members' ? (
        <div className="cp-grid">
          {/* Info Card */}
          <div className="cp-card">
            <h3 className="cp-card-title"><Building2 size={18} /> Informações da Empresa</h3>
            <div className="cp-info-list">
              <div className="cp-info-row">
                <span>Nome</span>
                <strong>{currentCompany.name}</strong>
              </div>
              <div className="cp-info-row">
                <span>Setor</span>
                <strong>{sectorInfo?.emoji} {sectorInfo?.label}</strong>
              </div>
              <div className="cp-info-row">
                <span>Membros</span>
                <strong>{members.length}</strong>
              </div>
              <div className="cp-info-row">
                <span>Criada em</span>
                <strong>
                  {(currentCompany.createdAt || currentCompany.created_at)
                    ? new Date(currentCompany.createdAt || currentCompany.created_at).toLocaleDateString('pt-BR')
                    : '—'}
                </strong>
              </div>
            </div>


            <div className="cp-invite-section">
              <label>
                Código de convite
                <span className="cp-hint"> — compartilhe para convidar membros</span>
              </label>
              <div className="cp-code-box">
                <code>{currentCompany.code || '------'}</code>
                <button className={`cp-copy-btn ${copied ? 'copied' : ''}`} onClick={handleCopyCode}>
                  {copied ? <><Check size={14} /> Copiado!</> : <><Copy size={14} /> Copiar</>}
                </button>
              </div>
              <p className="cp-invite-hint">O membro usa este código na tela de cadastro para entrar na sua empresa.</p>
            </div>
          </div>

          {/* Members Card */}
          <div className="cp-card">
            <div className="cp-members-header">
              <h3 className="cp-card-title">
                {isLoadingMembers ? <RefreshCcw size={18} className="animate-spin" style={{ color: '#00e5ff' }} /> : <Users size={18} />} 
                Membros da Equipe
              </h3>
              <button className="cp-refresh-btn" onClick={loadMembers} title="Atualizar">
                <RefreshCcw size={14} />
              </button>
            </div>

            <div className="cp-members-list">
              {isLoadingMembers && members.length === 0 ? (
                <>
                  <div className="cp-skeleton-row" />
                  <div className="cp-skeleton-row" />
                  <div className="cp-skeleton-row" />
                </>
              ) : (
                <>
                  {members.map(member => (
                    <div key={member.email} className="cp-member-row">
                      <div className="cp-member-avatar">
                        {member.email.substring(0, 2).toUpperCase()}
                      </div>
                      <div className="cp-member-info">
                        <span className="cp-member-email">{member.email}</span>
                        <span className={`cp-member-role ${member.role}`}>
                          {member.role === 'admin' ? '👑 Admin' : '🔹 Membro'}
                          {member.email === currentUser && ' · você'}
                        </span>
                      </div>
                      {userRole === 'admin' && member.email !== currentUser && (
                        <div className="cp-member-actions">
                          <button
                            className="cp-action-btn"
                            title={member.role === 'admin' ? 'Rebaixar para Membro' : 'Promover a Admin'}
                            onClick={() => handleToggleRole(member.email)}
                          >
                            <UserCheck2 size={15} />
                          </button>
                          <button
                            className="cp-action-btn danger"
                            title="Remover da empresa"
                            onClick={() => handleRemoveMember(member.email)}
                          >
                            <UserX size={15} />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                  {members.length === 0 && !isLoadingMembers && (
                    <div className="cp-empty">Nenhum membro encontrado. Compartilhe o código de convite!</div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Leaderboard Gamification Card */}
          <div className="cp-card" style={{ background: 'linear-gradient(145deg, #1e293b, #0f172a)', border: '1px solid rgba(251, 191, 36, 0.2)' }}>
            <div className="cp-members-header mb-4">
              <h3 className="cp-card-title text-amber-400" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Trophy size={20} className="text-amber-400" />
                Destaques do Mês (Top 3)
              </h3>
            </div>
            
            <div className="flex flex-col gap-3">
              {[...members]
                .sort((a,b) => (b.loyalty_points || 0) - (a.loyalty_points || 0))
                .slice(0, 3)
                .map((member, index) => {
                  const isTopOne = index === 0;
                  const rankColors = [
                    'text-amber-400 bg-amber-400/10 border-amber-400/30', // Ouro
                    'text-slate-300 bg-slate-400/10 border-slate-400/30', // Prata
                    'text-amber-700 bg-amber-700/10 border-amber-700/30'  // Bronze
                  ];
                  
                  return (
                    <div key={member.email} className="bg-white/5 border border-white/5 p-3 rounded-2xl flex items-center gap-4 relative overflow-hidden group hover:bg-white/10 transition-colors">
                      {isTopOne && <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-amber-400/20 to-transparent rounded-bl-full pointer-events-none"></div>}
                      
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center border font-bold ${rankColors[index]} shrink-0`}>
                        {isTopOne ? <Crown size={16} /> : <Medal size={16} />}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-slate-200 truncate">{member.email.split('@')[0]}</p>
                        <p className="text-xs text-slate-400 flex items-center gap-1">
                          <Check size={12} className="text-green-400" /> {member.monthly_missions_completed || 0} missões
                        </p>
                      </div>
                      
                      <div className="text-right">
                        <div className="flex items-center gap-1 bg-amber-400/10 text-amber-400 px-2 py-1 rounded-lg">
                          <Star size={12} className="fill-amber-400" />
                          <span className="font-black text-sm">{member.loyalty_points || 0}</span>
                        </div>
                        <p className="text-[9px] text-slate-500 uppercase tracking-widest mt-1">Pontos</p>
                      </div>
                    </div>
                  );
                })}
              
              {members.length === 0 && !isLoadingMembers && (
                <div className="text-center py-4 opacity-50 text-sm">Competição não iniciada.</div>
              )}
            </div>
          </div>

          {/* Collaborators Card */}
          <div className="cp-card">
            <div className="cp-members-header">
              <h3 className="cp-card-title">
                {isLoadingCollabs ? <RefreshCcw size={18} className="animate-spin" style={{ color: '#22c55e' }} /> : <UserPlus size={18} />} 
                Colaboradores de Campo
              </h3>
              <button className="cp-refresh-btn" onClick={loadCollaborators} title="Atualizar">
                <RefreshCcw size={14} />
              </button>
            </div>

            <div className="cp-members-list">
              {isLoadingCollabs && collaborators.length === 0 ? (
                <>
                  <div className="cp-skeleton-row" />
                  <div className="cp-skeleton-row" />
                </>
              ) : (
                <>
                  {userRole === 'admin' ? (
                    isAddingCollaborator ? (
                      <form className="cp-add-collab-form animate-slide-up" onSubmit={handleAddCollaborator}>
                        <input 
                          type="text" 
                          placeholder="Nome completo *" 
                          value={newCollab.name} 
                          onChange={e => setNewCollab({...newCollab, name: e.target.value})}
                          className="cp-input-small"
                          required
                        />
                        <input 
                          type="text" 
                          placeholder="Especialidade (ex: Pintor)" 
                          value={newCollab.specialty} 
                          onChange={e => setNewCollab({...newCollab, specialty: e.target.value})}
                          className="cp-input-small"
                        />
                        <input 
                          type="text" 
                          placeholder="Telefone" 
                          value={newCollab.phone} 
                          onChange={e => setNewCollab({...newCollab, phone: e.target.value})}
                          className="cp-input-small"
                        />
                        <div className="cp-form-actions">
                          <button type="button" className="cp-btn-cancel-small" onClick={() => setIsAddingCollaborator(false)}>Cancelar</button>
                          <button type="submit" className="cp-btn-save-small" disabled={isLoadingCollabs}>
                            {isLoadingCollabs ? 'Salvando...' : 'Salvar'}
                          </button>
                        </div>
                      </form>
                    ) : (
                      <button className="cp-add-btn-dash" onClick={() => setIsAddingCollaborator(true)}>
                        <Plus size={16} /> Adicionar Colaborador
                      </button>
                    )
                  ) : (
                    <div className="cp-hint-small py-2 px-1 opacity-60 italic text-xs">
                      Somente administradores podem cadastrar colaboradores.
                    </div>
                  )}

                  {collaborators.map(collab => (
                    <div key={collab.id} className="cp-member-row">
                      <div className="cp-member-avatar collab">
                        {collab.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div className="cp-member-info">
                        <span className="cp-member-email">{collab.name}</span>
                        <span className="cp-member-role">
                          <UserCheck2 size={11} style={{ marginRight: '4px' }} />
                          {collab.specialty || 'Colaborador'}
                          {collab.phone && ` · ${collab.phone}`}
                        </span>
                      </div>
                      {userRole === 'admin' && (
                        <div className="cp-member-actions">
                          <button
                            className="cp-action-btn danger"
                            title="Remover colaborador"
                            onClick={() => handleRemoveCollaborator(collab.id, collab.name)}
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                  {collaborators.length === 0 && !isAddingCollaborator && !isLoadingCollabs && (
                    <div className="cp-empty">Nenhum colaborador de campo cadastrado.</div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Work Environments Card */}
          <div className="cp-card">
            <div className="cp-members-header">
              <h3 className="cp-card-title">
                {isLoadingResources ? <RefreshCcw size={18} className="animate-spin" style={{ color: '#00e5ff' }} /> : <Building2 size={18} />} 
                Ambientes de Trabalho
              </h3>
            </div>

            <div className="cp-members-list">
              {userRole === 'admin' && (
                isAddingEnv ? (
                  <form className="cp-add-collab-form animate-slide-up" onSubmit={handleAddEnvironment}>
                    <input 
                      type="text" 
                      placeholder="Nome do Ambiente (ex: Portaria)" 
                      value={newEnvName} 
                      onChange={e => setNewEnvName(e.target.value)}
                      className="cp-input-small"
                      required
                      autoFocus
                    />
                    <div className="cp-form-actions">
                      <button type="button" className="cp-btn-cancel-small" onClick={() => setIsAddingEnv(false)}>Cancelar</button>
                      <button type="submit" className="cp-btn-save-small">Salvar</button>
                    </div>
                  </form>
                ) : (
                  <button className="cp-add-btn-dash" onClick={() => setIsAddingEnv(true)}>
                    <Plus size={16} /> Adicionar Ambiente
                  </button>
                )
              )}

              {environments.map(env => (
                <div key={env.id} className="cp-member-row">
                  <div className="cp-member-avatar env">
                    <Building2 size={14} />
                  </div>
                  <div className="cp-member-info">
                    <span className="cp-member-email">{env.name}</span>
                    <span className="cp-member-role">Localização / Unidade</span>
                  </div>
                  {userRole === 'admin' && (
                    <div className="cp-member-actions">
                      <button
                        className="cp-action-btn danger"
                        title="Remover ambiente"
                        onClick={() => handleRemoveEnvironment(env.id, env.name)}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  )}
                </div>
              ))}
              {environments.length === 0 && !isAddingEnv && !isLoadingResources && (
                <div className="cp-empty">Nenhum ambiente cadastrado.</div>
              )}
            </div>
          </div>

          {/* Work Activities Card */}
          <div className="cp-card">
            <div className="cp-members-header">
              <h3 className="cp-card-title">
                {isLoadingResources ? <RefreshCcw size={18} className="animate-spin" style={{ color: '#fbbf24' }} /> : <Calendar size={18} />} 
                Atividades Recomendadas
              </h3>
            </div>

            <div className="cp-members-list">
              {userRole === 'admin' && (
                isAddingActivity ? (
                  <form className="cp-add-collab-form animate-slide-up" onSubmit={handleAddActivity}>
                    <input 
                      type="text" 
                      placeholder="Nome da Atividade" 
                      value={newActivity.name} 
                      onChange={e => setNewActivity({...newActivity, name: e.target.value})}
                      className="cp-input-small"
                      required
                    />
                    <select 
                      value={newActivity.environment_id} 
                      onChange={e => setNewActivity({...newActivity, environment_id: e.target.value})}
                      className="cp-input-small"
                      required
                    >
                      <option value="">vincular a um ambiente...</option>
                      {environments.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                    </select>
                    <div className="cp-form-actions">
                      <button type="button" className="cp-btn-cancel-small" onClick={() => setIsAddingActivity(false)}>Cancelar</button>
                      <button type="submit" className="cp-btn-save-small">Salvar</button>
                    </div>
                  </form>
                ) : (
                  <button className="cp-add-btn-dash" onClick={() => setIsAddingActivity(true)}>
                    <Plus size={16} /> Nova Atividade
                  </button>
                )
              )}

              {workActivities.map(act => (
                <div key={act.id} className="cp-member-row">
                  <div className="cp-member-avatar activity">
                    <Calendar size={14} />
                  </div>
                  <div className="cp-member-info">
                    <span className="cp-member-email">{act.name}</span>
                    <span className="cp-member-role">
                      {act.work_environments?.name || 'Ambiente não definido'}
                    </span>
                  </div>
                  {userRole === 'admin' && (
                    <div className="cp-member-actions">
                      <button
                        className="cp-action-btn danger"
                        title="Remover atividade"
                        onClick={() => handleRemoveActivity(act.id, act.name)}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  )}
                </div>
              ))}
              {workActivities.length === 0 && !isAddingActivity && !isLoadingResources && (
                <div className="cp-empty">Nenhuma atividade cadastrada.</div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="cp-crm-section animate-slide-up">
          <div className="cp-crm-header">
            <div className="cp-crm-title-area">
              <h2 className="cp-crm-title">Gestão de Clientes</h2>
              <span className="cp-sector-tag">Total: {customers.length} clientes</span>
            </div>
            <button 
              className="cp-btn-new-customer"
              onClick={() => { setEditingCustomer(null); setShowCustModal(true); }}
            >
              <Plus size={18} /> Novo Cliente
            </button>
          </div>

          <div className="cp-customers-grid">
            {customers.map(customer => (
              <CustomerCard 
                key={customer.id} 
                customer={customer} 
                onEdit={() => { setEditingCustomer(customer); setShowCustModal(true); }}
                onDelete={async () => {
                  if (window.confirm(`Excluir cliente ${customer.name}?`)) {
                    const { error } = await supabase.from('customers').delete().eq('id', customer.id);
                    if (!error) {
                      setCustomers(prev => prev.filter(c => c.id !== customer.id));
                      logEvent(currentCompany.id, currentUser, 'CUSTOMER_DELETED', `Cliente ${customer.name} removido.`);
                    }
                  }
                }}
              />
            ))}
            {customers.length === 0 && !loadingCustomers && (
              <div className="cp-empty-crm">
                <p>Sua base de clientes está vazia.</p>
                <button 
                  className="kb-btn-template mt-2"
                  onClick={() => setShowCustModal(true)}
                >
                  <Plus size={16} /> Cadastrar Primeiro Cliente
                </button>
              </div>
            )}
            {loadingCustomers && <div className="cp-empty">Carregando clientes...</div>}
          </div>
        </div>
      )}

      {showCustModal && (
        <CustomerFormModal 
          isOpen={showCustModal}
          editingCustomer={editingCustomer}
          currentCompanyId={currentCompany.id}
          onClose={() => setShowCustModal(false)}
          onSave={(newCustomer) => {
            if (editingCustomer) {
              setCustomers(prev => prev.map(c => c.id === newCustomer.id ? newCustomer : c));
            } else {
              setCustomers(prev => [newCustomer, ...prev]);
            }
            setShowCustModal(false);
          }}
        />
      )}
      </div>
    </div>
  );
}
