import React, { useState } from 'react';
import { X, EyeOff, Eye, Sparkles, Check } from 'lucide-react';
import { GoogleLogin } from '@react-oauth/google';
import { supabase } from '../supabaseClient';
import './Login.css';

const errorMap = {
  '23505': 'Este email já está cadastrado.',
  'email_rate_limit_exceeded': 'Limite de envios de email atingido. Por favor, tente novamente em uma hora ou use o login com Google.',
  'Error sending confirmation email': 'Erro ao enviar email de confirmação. O servidor de emails do Supabase atingiu o limite. Tente usar o Login com Google.'
};

export default function Login({ onLogin }) {
  const [isRegistering, setIsRegistering] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [rememberMe, setRememberMe] = useState(true);

  const getPasswordStrength = (pass) => {
    if (!pass) return '';
    if (pass.length < 6) return 'weak';
    if (pass.length < 10 || !/[A-Z]/.test(pass) || !/[0-9]/.test(pass)) return 'medium';
    return 'strong';
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg('');

    const performAuth = async () => {
      try {
        if (isResetting) {
          const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: window.location.origin,
          });
          if (error) {
            setErrorMsg(error.message);
          } else {
            setSuccessMsg('Email de recuperação enviado! Verifique sua caixa de entrada.');
            setTimeout(() => setIsResetting(false), 5000);
          }
          return;
        }

        if (isRegistering) {
          // Sign up with Supabase Auth
          const { data: authData, error: authError } = await supabase.auth.signUp({
            email,
            password,
          });
          
          if (authError) {
            setErrorMsg(errorMap[authError.code] || authError.message);
            return;
          }

          // Insert into profiles (Resilient approach)
          const profileData = { email, role: 'member' };
          if (authData.user?.id) {
            // Try with user_id first
            const { error: insError } = await supabase.from('profiles').insert([
              { ...profileData, user_id: authData.user.id }
            ]);
            
            if (insError) {
              // Fallback if user_id column is missing
              await supabase.from('profiles').insert([profileData]);
            }
          } else {
            await supabase.from('profiles').insert([profileData]);
          }

          await onLogin(email);
        } else {
          // Sign in with Supabase Auth
          const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
          });

          if (error) {
            setErrorMsg(errorMap[error.code] || 'Email ou senha incorretos.');
          } else {
            await onLogin(email);
          }
        }
      } catch (err) {
        console.error("Auth Exception:", err);
        setErrorMsg('Ocorreu um erro inesperado durante a autenticação.');
      } finally {
        setIsLoading(false);
      }
    };

    performAuth();
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    setIsLoading(true); // Show loading even for Google
    setErrorMsg('');
    try {
      // Sign in to Supabase with the Google ID Token
      const { data: authData, error: authError } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: credentialResponse.credential,
      });

      if (authError) {
        console.error("Supabase Google Auth Error:", authError);
        // Show actual message to help debugging (likely "Provider google not enabled")
        setErrorMsg(`Falha na sincronização: ${authError.message}`);
        setIsLoading(false);
        return;
      }

      const googleEmail = authData.user?.email;
      const googleName = authData.user?.user_metadata?.full_name || 'Usuário Google';

      if (!googleEmail) {
        setErrorMsg('Email não retornado pelo Google.');
        setIsLoading(false);
        return;
      }

      // Ensure profile exists
      const { data: existingProfiles, error: profError } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', googleEmail);

      if (!profError && existingProfiles && existingProfiles.length === 0) {
        // Try Inserting with user_id first
        const { error: insError } = await supabase.from('profiles').insert([
          { 
            email: googleEmail, 
            name: googleName,
            user_id: authData.user?.id,
            role: 'member' 
          }
        ]);

        if (insError) {
          console.warn("Retrying profile insert without user_id column...");
          // Fallback: If user_id column is missing in DB, try without it
          await supabase.from('profiles').insert([
            { email: googleEmail, name: googleName, role: 'member' }
          ]);
        }
      } else if (profError) {
        console.error("Profile check error during Google Login:", profError);
      }
      
      await onLogin(googleEmail);
    } catch (err) {
      console.error("Google Auth Exception:", err);
      // Detailed message for timeout or other re-thrown errors
      setErrorMsg(err.message || 'Falha ao autenticar com o Google.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleError = () => {
    setErrorMsg('Login com Google falhou. Verifique se os cookies de terceiros estão permitidos.');
  };

  return (
    <div className="login-split-container">
      {/* COLUNA ESQUERDA: BRANDING & IMPACTO */}
      <div className="login-branding-side">
        <div className="branding-content">
          <div className="branding-logo">
            <span style={{ fontSize: '3rem', filter: 'drop-shadow(0 0 20px rgba(0, 229, 255, 0.4))' }}>🏢</span>
          </div>
          <h1>Bem-vindo ao <span>Synapse Smart</span></h1>
          <p>
            Uma plataforma com tecnologia de ponta para gerenciar suas equipes, 
            condomínios e processos com a inteligência da IA.
          </p>
          
          <div className="branding-badges">
            <div className="badge-item">
              <Sparkles size={16} /> <span>IA Integrada</span>
            </div>
            <div className="badge-item">
              <Check size={16} /> <span>Gestão 360º</span>
            </div>
          </div>
        </div>
        <div className="branding-overlay"></div>
      </div>

      {/* COLUNA DIREITA: FORMULÁRIO PREMIUM */}
      <div className="login-form-side">
        <div className="login-card-new">
          {!isResetting && (
            <div className="login-tabs">
              <div 
                className={`login-tab ${!isRegistering ? 'active' : ''}`}
                onClick={() => { setIsRegistering(false); setErrorMsg(''); setSuccessMsg(''); }}
              >
                Entrar
              </div>
              <div 
                className={`login-tab ${isRegistering ? 'active' : ''}`}
                onClick={() => { setIsRegistering(true); setErrorMsg(''); setSuccessMsg(''); }}
              >
                Cadastre-se
              </div>
            </div>
          )}

          {isResetting && (
            <div className="login-tabs">
              <div className="login-tab active">Recuperar Senha</div>
            </div>
          )}
          
          {errorMsg && <div className="login-error">{errorMsg}</div>}
          {successMsg && <div className="login-success" style={{
             background: 'rgba(34, 197, 94, 0.1)',
             border: '1px solid rgba(34, 197, 94, 0.3)',
             color: '#4ade80',
             padding: '1rem',
             borderRadius: '12px',
             marginBottom: '2rem',
             fontSize: '0.85rem',
             textAlign: 'center'
          }}>{successMsg}</div>}
          
          <form className="login-form-new" onSubmit={handleSubmit}>
            <div className="input-group-new">
              <label>Endereço de Email</label>
              <div className="input-wrapper-new">
                <input 
                  type="email" 
                  placeholder="exemplo@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>
            
            {!isResetting && (
              <div className="input-group-new">
                <div className="password-header">
                  <label>Senha</label>
                  {!isRegistering && (
                    <a href="#" className="forgot-password" onClick={(e) => { e.preventDefault(); setIsResetting(true); }}>
                      Esqueceu a senha?
                    </a>
                  )}
                </div>
                <div className="input-wrapper-new">
                  <input 
                    type={showPassword ? "text" : "password"} 
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required={!isResetting}
                  />
                  <button 
                    type="button" 
                    className="toggle-password-btn"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex="-1"
                  >
                    {showPassword ? <Eye size={18} /> : <EyeOff size={18} />}
                  </button>
                </div>
                {isRegistering && password && (
                  <div className="strength-meter-new">
                    <div className={`strength-bar-new ${getPasswordStrength(password)}`}></div>
                  </div>
                )}
              </div>
            )}

            {!isResetting && !isRegistering && (
              <div className="remember-me-new" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <input 
                  type="checkbox" 
                  id="remember" 
                  checked={rememberMe} 
                  onChange={(e) => setRememberMe(e.target.checked)}
                  style={{ cursor: 'pointer' }}
                />
                <label htmlFor="remember" style={{ fontSize: '0.8rem', color: '#94a3b8', cursor: 'pointer' }}>
                  Lembrar-me neste dispositivo
                </label>
              </div>
            )}
            
            <button type="submit" className={`login-button-primary ${isLoading ? 'loading' : ''}`} disabled={isLoading}>
              {isLoading ? <div className="spinner-new"></div> : (
                isResetting ? "Enviar Link de Recuperação" : 
                (isRegistering ? "Criar Minha Conta" : "Entrar no Sistema")
              )}
            </button>

            {isResetting && (
              <button 
                type="button" 
                className="cs-btn-secondary" 
                onClick={() => setIsResetting(false)}
                style={{ width: '100%', border: 'none', background: 'transparent' }}
              >
                Voltar ao Login
              </button>
            )}
          </form>

          {!isResetting && (
            <>
              <div className="login-divider">
                <span>OU</span>
              </div>

              <div className="login-google-wrapper">
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={handleGoogleError}
                  text="continue_with"
                  shape="rectangular"
                  logo_alignment="left"
                  locale="pt-BR"
                  theme="filled_blue"
                  size="large"
                  width="320"
                />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
