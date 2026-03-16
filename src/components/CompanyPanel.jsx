import React, { useState, useEffect } from 'react';
import { Building2, Users, Copy, Check, Crown, Shield, UserCheck2, UserX, RefreshCcw, Plus, MapPin, Mail, Phone, Trash2, Edit2, X, Calendar, UserPlus } from 'lucide-react';
import CustomerCard from './CustomerCard';
import CustomerFormModal from './CustomerFormModal';
import { logEvent } from '../services/historyService';
import { SECTOR_TEMPLATES } from './CompanySetup';
import { supabase } from '../supabaseClient';
import './CompanyPanel.css';

export default function CompanyPanel({ currentUser, currentCompany, userRole }) {
  const [members, setMembers] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [activeTab, setActiveTab] = useState('members'); // 'members' or 'customers'
  const [copied, setCopied] = useState(false);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  
  // Collaborators
  const [collaborators, setCollaborators] = useState([]);
  const [isAddingCollaborator, setIsAddingCollaborator] = useState(false);
  const [newCollab, setNewCollab] = useState({ name: '', specialty: '', phone: '' });
  const [isLoadingCollabs, setIsLoadingCollabs] = useState(false);

  const loadMembers = async () => {
    if (!currentCompany?.id) return;
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('company_id', currentCompany.id);

    if (!error && data) {
      // Map back to handle potential camelCase/snake_case differences
      const mapped = data.map(u => ({
        ...u,
        companyId: u.company_id
      }));
      setMembers(mapped);
    } else if (error) {
      console.error('Error loading members:', error);
    }
  };

  const loadCustomers = async () => {
    if (!currentCompany?.id) return;
    setLoadingCustomers(true);
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('company_id', currentCompany.id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setCustomers(data);
    } else if (error) {
      console.error('Error loading customers:', error);
    }
    setLoadingCustomers(false);
  };
  
  const loadCollaborators = async () => {
    if (!currentCompany?.id) return;
    setIsLoadingCollabs(true);
    const { data, error } = await supabase
      .from('collaborators')
      .select('*')
      .eq('company_id', currentCompany.id)
      .order('name', { ascending: true });

    if (!error && data) {
      setCollaborators(data);
    } else if (error) {
      console.error('Error loading collaborators:', error);
    }
    setIsLoadingCollabs(false);
  };

  useEffect(() => {
    loadMembers();
    loadCustomers();
    loadCollaborators();
  }, [currentCompany]);

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

    const { data, error } = await supabase
      .from('collaborators')
      .insert([payload])
      .select();

    if (!error && data) {
      setCollaborators(prev => [...prev, data[0]]);
      setNewCollab({ name: '', specialty: '', phone: '' });
      setIsAddingCollaborator(false);
      logEvent(currentCompany.id, currentUser, 'COLLABORATOR_ADDED', `Colaborador ${newCollab.name} adicionado.`);
    } else {
      console.error('Error adding collaborator:', error);
      alert('Erro ao adicionar colaborador. Verifique se a tabela existe no banco.');
    }
    setIsLoadingCollabs(false);
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

            <div className="cp-divider" />

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
              <h3 className="cp-card-title"><Users size={18} /> Membros da Equipe</h3>
              <button className="cp-refresh-btn" onClick={loadMembers} title="Atualizar">
                <RefreshCcw size={14} />
              </button>
            </div>

            <div className="cp-members-list">
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
              {members.length === 0 && (
                <div className="cp-empty">Nenhum membro encontrado. Compartilhe o código de convite!</div>
              )}
            </div>
          </div>

          {/* Collaborators Card */}
          <div className="cp-card">
            <div className="cp-members-header">
              <h3 className="cp-card-title"><UserPlus size={18} /> Colaboradores de Campo</h3>
              <button className="cp-refresh-btn" onClick={loadCollaborators} title="Atualizar">
                <RefreshCcw size={14} />
              </button>
            </div>

            <div className="cp-members-list">
              {isAddingCollaborator ? (
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
              {collaborators.length === 0 && !isAddingCollaborator && (
                <div className="cp-empty">Nenhum colaborador de campo cadastrado.</div>
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
              onClick={() => { setEditingCustomer(null); setIsCustomerModalOpen(true); }}
            >
              <Plus size={18} /> Novo Cliente
            </button>
          </div>

          <div className="cp-customers-grid">
            {customers.map(customer => (
              <CustomerCard 
                key={customer.id} 
                customer={customer} 
                onEdit={() => { setEditingCustomer(customer); setIsCustomerModalOpen(true); }}
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
                  onClick={() => setIsCustomerModalOpen(true)}
                >
                  <Plus size={16} /> Cadastrar Primeiro Cliente
                </button>
              </div>
            )}
            {loadingCustomers && <div className="cp-empty">Carregando clientes...</div>}
          </div>
        </div>
      )}

      {isCustomerModalOpen && (
        <CustomerFormModal 
          isOpen={isCustomerModalOpen}
          editingCustomer={editingCustomer}
          currentCompanyId={currentCompany.id}
          onClose={() => setIsCustomerModalOpen(false)}
          onSave={(newCustomer) => {
            if (editingCustomer) {
              setCustomers(prev => prev.map(c => c.id === newCustomer.id ? newCustomer : c));
            } else {
              setCustomers(prev => [newCustomer, ...prev]);
            }
            setIsCustomerModalOpen(false);
          }}
        />
      )}
      </div>
    </div>
  );
}
