import React, { useState } from 'react';
import { User, Mail, Shield, Camera, Save, CheckCircle } from 'lucide-react';
import './Dashboard.css'; // Reusing common styles

export default function UserProfile({ currentUser, currentCompany, userRole }) {
  const [name, setName] = useState(currentUser ? currentUser.split('@')[0] : '');
  const [isSaved, setIsSaved] = useState(false);

  const handleSave = () => {
    // In a real app, this would update Supabase profiles
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  const userInitials = name ? name.substring(0, 2).toUpperCase() : 'UP';

  return (
    <div className="p-8 animate-fade-in" style={{ maxWidth: '800px', margin: '0 auto' }}>
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <User size={28} className="text-accent" /> Meu Perfil
        </h1>
        <p className="text-muted text-sm mt-1">Gerencie suas informações pessoais e preferências de conta.</p>
      </header>

      <div className="bg-panel border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
        {/* Header/Cover */}
        <div className="h-32 bg-gradient-to-r from-accent/20 to-purple-500/10 border-b border-white/5 relative">
          <div className="absolute -bottom-12 left-8">
            <div className="w-24 h-24 rounded-2xl bg-[#1e293b] border-4 border-[#0f172a] flex items-center justify-center text-3xl font-bold text-accent shadow-xl relative group">
              {userInitials}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl flex items-center justify-center cursor-pointer">
                <Camera size={20} className="text-white" />
              </div>
            </div>
          </div>
        </div>

        <div className="pt-16 p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div>
                <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-2">Nome de Exibição</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-muted/50" size={16} />
                  <input 
                    type="text" 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-10 py-3 text-white focus:border-accent outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-2">E-mail</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-muted/50" size={16} />
                  <input 
                    type="email" 
                    value={currentUser}
                    readOnly
                    className="w-full bg-white/3 border border-white/5 rounded-xl px-10 py-3 text-muted/70 cursor-not-allowed outline-none"
                  />
                </div>
                <p className="text-[10px] text-muted/40 mt-1.5 flex items-center gap-1.5 px-1">
                  <Shield size={10} /> O e-mail é gerido pela sua conta de login e não pode ser alterado aqui.
                </p>
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-2">Empresa Atual</label>
                <div className="p-4 bg-white/5 border border-white/10 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center text-accent font-bold">
                      {currentCompany?.name?.[0].toUpperCase() || 'C'}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">{currentCompany?.name || 'Nenhuma Empresa'}</p>
                      <p className="text-xs text-muted capitalizae">{userRole === 'admin' ? 'Administrador' : 'Membro da Equipe'}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-2">Status da Conta</label>
                <div className="flex items-center gap-2 px-1">
                  <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]"></div>
                  <span className="text-sm text-white font-medium">Ativa e Verificada</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-12 pt-8 border-t border-white/5 flex justify-end gap-4">
            <button 
              onClick={handleSave}
              className={`flex items-center gap-2 px-8 py-3 rounded-xl font-bold transition-all ${isSaved ? 'bg-green-500 text-white' : 'bg-accent text-[#001820] hover:scale-105 active:scale-100 shadow-lg shadow-accent/20'}`}
            >
              {isSaved ? <><CheckCircle size={18} /> Salvo!</> : <><Save size={18} /> Salvar Alterações</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
