import React, { useState, useEffect, useRef } from 'react';
import { User, Shield, Camera, Save, CheckCircle, Loader2, AtSign, Sparkles } from 'lucide-react';
import { supabase } from '../supabaseClient';
import './AccountViews.css';

export default function UserProfile({ currentUser, currentCompany, userRole, onProfileUpdate }) {
  const CACHE_KEY = `kabania_profile_${currentUser}`;

  // ── Load from cache instantly (no spinner on revisit) ──────────────────
  const loadCache = () => {
    try { return JSON.parse(localStorage.getItem(CACHE_KEY)); } catch { return null; }
  };
  const cached = loadCache();

  const [firstName, setFirstName] = useState(cached?.first_name || '');
  const [lastName, setLastName] = useState(cached?.last_name || '');
  const [username, setUsername] = useState(cached?.username || currentUser?.split('@')[0] || '');
  const [phone, setPhone] = useState(cached?.phone_number || '');
  const [stats, setStats] = useState(cached?.stats || { transactions: 0, joiningDate: '' });
  const [avatarUrl, setAvatarUrl] = useState(cached?.avatar_url || null);
  const [isSaved, setIsSaved] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  // Only show full-screen spinner when there's no cached data at all
  const [isFetching, setIsFetching] = useState(!cached);
  const [originalData, setOriginalData] = useState(cached || null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!currentUser) return;
      // Only block UI if we have nothing to show
      if (!loadCache()) setIsFetching(true);

      const { data, error } = await supabase
        .from('profiles')
        .select('name, first_name, last_name, username, phone_number, avatar_url, created_at')
        .eq('email', currentUser)
        .single();

      if (!error && data) {
        setFirstName(data.first_name || '');
        setLastName(data.last_name || '');
        setUsername(data.username || currentUser.split('@')[0]);
        setPhone(data.phone_number || '');
        setAvatarUrl(data.avatar_url);

        const { count } = await supabase
          .from('inventory_transactions')
          .select('*', { count: 'exact', head: true })
          .eq('user_email', currentUser);

        const freshStats = {
          transactions: count || 0,
          joiningDate: new Date(data.created_at || Date.now()).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
        };
        setStats(freshStats);
        setOriginalData(data);

        // ── Save to cache ──────────────────────────────────────────────────
        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify({ ...data, stats: freshStats }));
        } catch {}

        if (onProfileUpdate) {
          onProfileUpdate({
            name: data.first_name ? `${data.first_name} ${data.last_name || ''}`.trim() : (data.name || currentUser.split('@')[0]),
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
    setIsFetching(true);
    const { error } = await supabase
      .from('profiles')
      .update({
        first_name: firstName,
        last_name: lastName,
        username,
        phone_number: phone,
        name: `${firstName} ${lastName}`.trim()
      })
      .eq('email', currentUser);

    if (!error) {
      setIsSaved(true);
      setOriginalData({ ...originalData, first_name: firstName, last_name: lastName, username, phone_number: phone });
      if (onProfileUpdate) onProfileUpdate({ name: `${firstName} ${lastName}`.trim() });
      setTimeout(() => setIsSaved(false), 3000);
    } else {
      console.error('Error updating profile:', error);
    }
    setIsFetching(false);
  };

  const handleDiscard = () => {
    if (originalData) {
      setFirstName(originalData.first_name || '');
      setLastName(originalData.last_name || '');
      setUsername(originalData.username || currentUser.split('@')[0]);
      setPhone(originalData.phone_number || '');
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
          const MAX = 400;
          let { width, height } = img;
          if (width > height) {
            if (width > MAX) { height *= MAX / width; width = MAX; }
          } else {
            if (height > MAX) { width *= MAX / height; height = MAX; }
          }
          canvas.width = width;
          canvas.height = height;
          canvas.getContext('2d').drawImage(img, 0, 0, width, height);
          canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.8);
        };
      };
    });
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !currentUser) return;
    try {
      setIsUploading(true);
      const compressedBlob = await compressImage(file);
      const fileName = `${currentUser.replace(/[^a-zA-Z0-9]/g, '_')}_${Math.random().toString(36).substring(7)}.jpg`;
      const filePath = `avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, compressedBlob, { contentType: 'image/jpeg' });
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('email', currentUser);
      if (updateError) throw updateError;

      setAvatarUrl(publicUrl);
      if (onProfileUpdate) onProfileUpdate({ avatar_url: publicUrl });
    } catch (err) {
      console.error('Avatar upload error:', err);
      alert('Erro ao fazer upload da imagem.');
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const userInitials = firstName
    ? (firstName[0] + (lastName?.[0] || '')).toUpperCase()
    : (username ? username.substring(0, 2).toUpperCase() : 'UP');

  if (isFetching) {
    return (
      <div className="account-view-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '400px' }}>
        <Loader2 className="animate-spin" size={32} style={{ color: 'var(--accent-cyan)' }} />
      </div>
    );
  }

  return (
    <div className="account-view-container">
      <div className="profile-bg-text">{firstName || 'Synapse'}</div>

      <div className="profile-dashboard-grid">
        {/* LEFT SIDEBAR */}
        <div className="profile-left-sidebar">
          <div className="account-card" style={{ padding: '1.5rem' }}>
            <header style={{ marginBottom: '1.5rem', paddingLeft: '0.25rem' }}>
              <h1 style={{ fontSize: '1.25rem', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '0.5rem', letterSpacing: '-0.05em' }}>
                <Sparkles size={20} style={{ color: 'var(--accent-cyan)' }} /> SYNAPSE
              </h1>
              <p style={{ fontSize: '0.6rem', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.2em', opacity: 0.4, marginTop: '0.25rem' }}>
                Core Terminal
              </p>
            </header>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', width: '100%' }}>
              <div className="nav-pill-premium active">
                <User size={16} style={{ color: '#000' }} />
                <span className="nav-pill-label">Perfil Geral</span>
              </div>
              <div className="nav-pill-premium">
                <Shield size={16} />
                <span className="nav-pill-label">Segurança</span>
              </div>
              <div className="nav-pill-premium">
                <AtSign size={16} />
                <span className="nav-pill-label">Privacidade</span>
              </div>
            </div>
          </div>

          <div className="account-card" style={{ padding: '1.5rem' }}>
            <h4 style={{ fontSize: '0.55rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: '1rem', opacity: 0.4 }}>
              Status do Link
            </h4>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginBottom: '0.5rem' }}>
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div
                  key={i}
                  style={{
                    height: '4px',
                    flex: 1,
                    borderRadius: '9999px',
                    background: i <= 5 ? 'var(--accent-cyan)' : 'rgba(255,255,255,0.05)',
                    boxShadow: i <= 5 ? '0 0 8px rgba(0,229,255,0.4)' : 'none'
                  }}
                />
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
              <span style={{ fontSize: '0.5rem', textTransform: 'uppercase', fontWeight: 700 }}>Integridade</span>
              <span style={{ fontSize: '0.65rem', color: '#22c55e', fontWeight: 900 }}>98.4%</span>
            </div>
          </div>
        </div>

        {/* MAIN CONTENT */}
        <div className="profile-main-content">
          {/* FORM SECTION */}
          <div className="profile-content-section">
            <div className="account-card">
              {/* Base Identity Header */}
              <div style={{ padding: '2rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ padding: '0.625rem', background: 'rgba(0,229,255,0.05)', borderRadius: '12px', border: '1px solid rgba(0,229,255,0.1)', display: 'flex' }}>
                      <User size={20} style={{ color: 'var(--accent-cyan)' }} />
                    </div>
                    <div>
                      <h3 style={{ fontSize: '1.25rem', fontWeight: 900, letterSpacing: '-0.05em', textTransform: 'uppercase' }}>Base Identity</h3>
                      <p style={{ fontSize: '0.625rem', opacity: 0.6, marginTop: '0.125rem' }}>Sincronização de metadados pessoais.</p>
                    </div>
                  </div>
                  <div className="innovative-badge" style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)', color: '#22c55e', padding: '0.25rem 0.75rem', display: 'flex', alignItems: 'center', gap: '0.375rem', borderRadius: '999px', fontSize: '0.65rem', fontWeight: 900 }}>
                    <div style={{ width: '6px', height: '6px', background: '#22c55e', borderRadius: '50%', animation: 'pulse 2s infinite' }} />
                    ENC-256 LIVE
                  </div>
                </div>
              </div>

              {/* Form Fields */}
              <div style={{ padding: '2rem' }}>
                <div className="profile-grid-premium">
                  <div className="form-group-premium">
                    <label className="form-label">Codename</label>
                    <div className="form-input-wrapper-premium">
                      <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} className="form-input-premium" placeholder="Primeiro nome" />
                    </div>
                  </div>
                  <div className="form-group-premium">
                    <label className="form-label">Legacy Handle</label>
                    <div className="form-input-wrapper-premium">
                      <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} className="form-input-premium" placeholder="Sobrenome" />
                    </div>
                  </div>
                  <div className="form-group-premium">
                    <label className="form-label">Neural ID (@)</label>
                    <div className="form-input-wrapper-premium">
                      <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} className="form-input-premium" placeholder="username" />
                    </div>
                  </div>
                  <div className="form-group-premium">
                    <label className="form-label">Voice Frequency</label>
                    <div className="form-input-wrapper-premium">
                      <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} className="form-input-premium" placeholder="+00 (00) 00000-0000" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Security Section */}
              <div style={{ padding: '2rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem' }}>
                  <div style={{ padding: '0.625rem', background: 'rgba(168,85,247,0.05)', borderRadius: '12px', border: '1px solid rgba(168,85,247,0.1)', display: 'flex' }}>
                    <Shield size={20} style={{ color: '#a855f7' }} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 900, letterSpacing: '-0.05em', textTransform: 'uppercase' }}>Proteção</h3>
                    <p style={{ fontSize: '0.625rem', opacity: 0.6, marginTop: '0.125rem' }}>Criptografia e chaves de acesso.</p>
                  </div>
                </div>
                <div className="profile-grid-premium">
                  <div className="form-group-premium">
                    <label className="form-label">Gateway Access</label>
                    <div className="form-input-wrapper-premium">
                      <input type="email" value={currentUser} readOnly className="form-input-premium" style={{ opacity: 0.4, cursor: 'not-allowed' }} />
                    </div>
                  </div>
                  <div className="form-group-premium">
                    <label className="form-label">Master Token</label>
                    <div className="form-input-wrapper-premium">
                      <input type="password" value="********" readOnly className="form-input-premium" style={{ opacity: 0.4, cursor: 'not-allowed' }} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer Bar */}
              <div style={{ padding: '1.25rem 2rem', background: 'rgba(255,255,255,0.02)', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.55rem', fontWeight: 700 }}>
                    <div style={{ width: '6px', height: '6px', background: 'var(--accent-cyan)', borderRadius: '50%' }} />
                    SYNC: OK
                  </div>
                  <div style={{ fontSize: '0.55rem', fontWeight: 700, opacity: 0.4 }}>LATENCY: 12ms</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <button onClick={handleDiscard} className="btn-cancel-premium">DESCARTAR</button>
                  <button onClick={handleSave} className={`btn-save-premium ${isSaved ? 'success' : ''}`} disabled={isSaved}>
                    {isSaved ? <CheckCircle size={14} /> : <Save size={14} />}
                    {isSaved ? 'SALVO' : 'SALVAR'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* SIDE PANEL - IDENTITY CARD */}
          <div className="profile-side-panel">
            <div className="identity-card-premium">
              {/* Avatar */}
              <div className="identity-avatar-large" onClick={handleAvatarClick}>
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '48px' }} />
                ) : (
                  <span style={{ fontSize: '3rem', fontWeight: 900, color: '#fff', userSelect: 'none' }}>{userInitials}</span>
                )}
                <div className="identity-status-badge" />
                <div className="profile-avatar-overlay">
                  {isUploading
                    ? <Loader2 size={28} style={{ color: '#fff', animation: 'spin 1s linear infinite' }} />
                    : <Camera size={28} style={{ color: '#fff' }} />
                  }
                </div>
              </div>

              <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" style={{ display: 'none' }} />

              <h2 style={{ fontSize: '1.75rem', fontWeight: 900, marginTop: '1.25rem', letterSpacing: '-0.05em' }}>
                {firstName} {lastName}
              </h2>
              <p style={{ color: 'var(--accent-cyan)', fontWeight: 900, fontSize: '0.7rem', letterSpacing: '0.2em', textTransform: 'uppercase', opacity: 0.7, marginTop: '0.25rem' }}>
                @{username}
              </p>

              <div className="id-stat-grid" style={{ marginTop: '2rem' }}>
                <div className="id-stat-pill">
                  <span className="id-stat-value">{stats.transactions}</span>
                  <span className="id-stat-label">Registros</span>
                </div>
                <div className="id-stat-pill">
                  <span className="id-stat-value">Alpha</span>
                  <span className="id-stat-label">Tipo Conta</span>
                </div>
              </div>

              <div style={{ marginTop: '2rem', paddingTop: '2rem', borderTop: '1px solid rgba(255,255,255,0.05)', width: '100%', textAlign: 'left' }}>
                <label className="form-label" style={{ marginBottom: '1rem', display: 'block' }}>Unidade Operacional</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'rgba(255,255,255,0.05)', padding: '1.25rem', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <div style={{ width: '52px', height: '52px', background: 'linear-gradient(135deg, var(--accent-cyan), #7C3AED)', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 900, fontSize: '1.25rem', flexShrink: 0 }}>
                    {currentCompany?.name?.[0]?.toUpperCase() || 'S'}
                  </div>
                  <div>
                    <h4 style={{ fontSize: '1rem', fontWeight: 900, lineHeight: '1.2' }}>{currentCompany?.name || 'Synapse Base'}</h4>
                    <p style={{ fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.5, marginTop: '0.25rem' }}>Status: Ativo</p>
                  </div>
                </div>
                <div style={{ marginTop: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem' }}>
                    <span style={{ opacity: 0.5 }}>Membro desde</span>
                    <span style={{ fontWeight: 700 }}>{stats.joiningDate}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem' }}>
                    <span style={{ opacity: 0.5 }}>Integridade Neural</span>
                    <span style={{ color: '#22c55e', fontWeight: 700 }}>Ótima</span>
                  </div>
                </div>
              </div>
            </div>

            {/* AI Sync Card */}
            <div style={{ background: 'rgba(0,229,255,0.04)', border: '1px solid rgba(0,229,255,0.1)', borderRadius: '20px', padding: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <Sparkles size={14} style={{ color: 'var(--accent-cyan)' }} />
                <h4 style={{ fontSize: '0.65rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.15em' }}>Sincronia IA</h4>
              </div>
              <p style={{ fontSize: '0.75rem', lineHeight: '1.6', opacity: 0.75 }}>
                Seu perfil está 85% otimizado. Adicione uma foto real para melhorar a identificação biométrica em auditorias visuais do sistema.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
