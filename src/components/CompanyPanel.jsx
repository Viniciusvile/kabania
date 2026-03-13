import React, { useState, useEffect } from 'react';
import { Building2, Users, Copy, Check, Crown, Shield, UserCheck2, UserX, RefreshCcw } from 'lucide-react';
import { logEvent } from '../services/historyService';
import { SECTOR_TEMPLATES } from './CompanySetup';
import './CompanyPanel.css';

export default function CompanyPanel({ currentUser, currentCompany, userRole }) {
  const [members, setMembers] = useState([]);
  const [copied, setCopied] = useState(false);

  const loadMembers = () => {
    if (!currentCompany) return;
    const users = JSON.parse(localStorage.getItem('synapseUsers') || '[]');
    setMembers(users.filter(u => u.companyId === currentCompany.id));
  };

  useEffect(() => {
    loadMembers();
  }, [currentCompany]);

  const handleCopyCode = () => {
    if (!currentCompany?.code) return;
    navigator.clipboard.writeText(currentCompany.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleToggleRole = (memberEmail) => {
    if (memberEmail === currentUser) return;
    const users = JSON.parse(localStorage.getItem('synapseUsers') || '[]');
    const updated = users.map(u =>
      u.email === memberEmail && u.companyId === currentCompany.id
        ? { ...u, role: u.role === 'admin' ? 'member' : 'admin' }
        : u
    );
    localStorage.setItem('synapseUsers', JSON.stringify(updated));
    setMembers(updated.filter(u => u.companyId === currentCompany.id));
    logEvent(currentCompany.id, currentUser, 'MEMBER_ROLE_CHANGE', `Permissões de ${memberEmail} alteradas.`);
  };

  const handleRemoveMember = (memberEmail) => {
    if (memberEmail === currentUser) return;
    if (!window.confirm(`Remover ${memberEmail} da empresa?`)) return;
    const users = JSON.parse(localStorage.getItem('synapseUsers') || '[]');
    const updated = users.map(u =>
      u.email === memberEmail && u.companyId === currentCompany.id
        ? { ...u, companyId: null, role: null }
        : u
    );
    localStorage.setItem('synapseUsers', JSON.stringify(updated));
    setMembers(updated.filter(u => u.companyId === currentCompany.id));
    logEvent(currentCompany.id, currentUser, 'MEMBER_REMOVED', `Membro ${memberEmail} removido da empresa.`);
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
                {currentCompany.createdAt
                  ? new Date(currentCompany.createdAt).toLocaleDateString('pt-BR')
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
      </div>
    </div>
  );
}
