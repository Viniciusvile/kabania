import React, { useState, useEffect, useRef } from 'react';
import { User, Mail, Shield, Camera, Save, CheckCircle, Loader2 } from 'lucide-react';
import { supabase } from '../supabaseClient';
import './AccountViews.css';

export default function UserProfile({ currentUser, currentCompany, userRole, onProfileUpdate }) {
  const [name, setName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [isSaved, setIsSaved] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!currentUser) return;
      setIsFetching(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('name, avatar_url')
        .eq('email', currentUser)
        .single();
      
      if (!error && data) {
        setName(data.name || currentUser.split('@')[0]);
        setAvatarUrl(data.avatar_url);
        // Important: sync cache if it was empty or different
        if (onProfileUpdate) {
            onProfileUpdate({ 
                name: data.name || currentUser.split('@')[0], 
                avatar_url: data.avatar_url 
            });
        }
      }
      setIsFetching(false);
    };
    fetchProfile();
  }, [currentUser]);

  const handleSave = async () => {
    if (!currentUser) return;
    
    const { error } = await supabase
      .from('profiles')
      .update({ name })
      .eq('email', currentUser);

    if (!error) {
      setIsSaved(true);
      if (onProfileUpdate) onProfileUpdate({ name });
      setTimeout(() => setIsSaved(false), 3000);
    } else {
      console.error("Error updating profile:", error);
    }
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const compressImage = (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 400;
          const MAX_HEIGHT = 400;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          canvas.toBlob((blob) => {
            resolve(blob);
          }, 'image/jpeg', 0.8);
        };
      };
    });
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !currentUser) return;

    try {
      setIsUploading(true);
      
      // Compress the image before upload
      const compressedBlob = await compressImage(file);
      
      const fileExt = 'jpg'; // We compress to JPEG
      const fileName = `${currentUser.replace(/[^a-zA-Z0-9]/g, '_')}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      // 1. Upload to Storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, compressedBlob, { contentType: 'image/jpeg' });

      if (uploadError) throw uploadError;

      // 2. Get Public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // 3. Update Profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('email', currentUser);

      if (updateError) throw updateError;

      setAvatarUrl(publicUrl);
      if (onProfileUpdate) onProfileUpdate({ avatar_url: publicUrl });
    } catch (err) {
      console.error("Avatar upload error:", err);
      alert("Erro ao fazer upload da imagem. Certifique-se de ter rodado o script SQL e que o bucket 'avatars' exista.");
    } finally {
      setIsUploading(false);
    }
  };

  const userInitials = name ? name.substring(0, 2).toUpperCase() : 'UP';

  if (isFetching) {
    return (
      <div className="account-view-container flex items-center justify-center min-h-[400px]">
        <Loader2 className="animate-spin text-accent" size={32} />
      </div>
    );
  }

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
            <div className="profile-avatar" onClick={handleAvatarClick}>
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover rounded-2xl" />
              ) : (
                userInitials
              )}
              <div className="profile-avatar-overlay">
                {isUploading ? <Loader2 className="animate-spin text-white" size={20} /> : <Camera size={20} className="text-white" />}
              </div>
            </div>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
              accept="image/*" 
              style={{ display: 'none' }} 
            />
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
                <div className="settings-card" style={{ cursor: 'default' }}>
                  <div className="inv-history-icon-box" style={{ background: 'var(--accent-cyan-dim)', color: 'var(--accent-cyan)' }}>
                    {currentCompany?.name?.[0].toUpperCase() || 'C'}
                  </div>
                  <div>
                    <h4 className="settings-item" style={{ border: 'none', background: 'transparent', padding: 0, fontSize: '1rem', fontWeight: 800 }}>
                      {currentCompany?.name || 'Nenhuma Empresa'}
                    </h4>
                    <p className="settings-card-title text-sm capitalize mt-1">
                      {userRole === 'admin' ? 'Administrador' : 'Membro da Equipe'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Status da Conta</label>
                <div className="settings-card" style={{ cursor: 'default', background: 'transparent', borderColor: 'transparent', paddingLeft: 0 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 10px #22c55e' }}></div>
                  <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-main)' }}>Ativa e Verificada</span>
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
