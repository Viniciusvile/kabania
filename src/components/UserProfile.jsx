import React, { useState } from 'react';
import { User, Mail, Shield, Camera, Save, CheckCircle } from 'lucide-react';
import './AccountViews.css';

export default function UserProfile({ currentUser, currentCompany, userRole }) {
  const [name, setName] = useState(currentUser ? currentUser.split('@')[0] : '');
  const [isSaved, setIsSaved] = useState(false);

  const handleSave = () => {
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  const userInitials = name ? name.substring(0, 2).toUpperCase() : 'UP';

  return (
    <div className="account-view-container">
      <header className="account-header">
        <h1 className="account-title">
          <User size={28} className="text-accent" /> Meu Perfil
        </h1>
        <p className="account-subtitle">Gerencie suas informações pessoais e preferências de conta.</p>
      </header>

      <div className="account-card">
        <div className="profile-cover">
          <div className="profile-avatar-wrapper">
            <div className="profile-avatar">
              {userInitials}
              <div className="profile-avatar-overlay">
                <Camera size={20} className="text-white" />
              </div>
            </div>
          </div>
        </div>

        <div className="profile-content">
          <div className="profile-grid">
            <div className="profile-info-column">
              <div className="form-group">
                <label className="form-label">Nome de Exibição</label>
                <div className="form-input-wrapper">
                  <User className="form-icon" size={16} />
                  <input 
                    type="text" 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="form-input"
                    placeholder="Seu nome"
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">E-mail</label>
                <div className="form-input-wrapper">
                  <Mail className="form-icon" size={16} />
                  <input 
                    type="email" 
                    value={currentUser}
                    readOnly
                    className="form-input"
                  />
                </div>
                <p className="text-[10px] text-muted mt-2 flex items-center gap-1.5 opacity-60">
                  <Shield size={10} /> O e-mail é gerido pela sua conta de login.
                </p>
              </div>
            </div>

            <div className="profile-info-column">
              <div className="form-group">
                <label className="form-label">Empresa Atual</label>
                <div className="account-section" style={{ padding: '1rem' }}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center text-accent font-bold">
                      {currentCompany?.name?.[0].toUpperCase() || 'C'}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">{currentCompany?.name || 'Nenhuma Empresa'}</p>
                      <p className="text-[11px] text-muted capitalize">{userRole === 'admin' ? 'Administrador' : 'Membro da Equipe'}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Status da Conta</label>
                <div className="flex items-center gap-2 mt-1">
                  <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]"></div>
                  <span className="text-sm text-white font-medium">Ativa e Verificada</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-white/5 flex justify-end">
            <button 
              onClick={handleSave}
              className={`btn-premium ${isSaved ? 'bg-green-500 text-white' : 'btn-premium-primary'}`}
            >
              {isSaved ? <><CheckCircle size={18} /> Salvo!</> : <><Save size={18} /> Salvar Alterações</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
