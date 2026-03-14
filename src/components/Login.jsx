import React, { useState } from 'react';
import { X, EyeOff, Eye } from 'lucide-react';
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
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg('');

    const performAuth = async () => {
      if (isRegistering) {
        // Sign up with Supabase Auth (hashes password automatically)
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email,
          password,
        });
        
        if (authError) {
          setErrorMsg(errorMap[authError.code] || authError.message);
          setIsLoading(false);
          return;
        }

        // Insert into profiles if needed (Supabase usually handles this via triggers, but we'll do it manually for now to sync)
        const { error: profError } = await supabase.from('profiles').insert([
          { email, role: 'member', user_id: authData.user?.id }
        ]);
        
        if (profError && profError.code !== '23505') {
          console.error("Erro ao criar perfil:", profError);
        }

        onLogin(email);
      } else {
        // Sign in with Supabase Auth
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          setErrorMsg(errorMap[error.code] || 'Email ou senha incorretos.');
        } else {
          onLogin(email);
        }
      }
      setIsLoading(false);
    };

    performAuth();
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      // Sign in to Supabase with the Google ID Token
      const { data: authData, error: authError } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: credentialResponse.credential,
      });

      if (authError) {
        console.error("Supabase Google Auth Error:", authError);
        setErrorMsg('Falha ao sincronizar login com o servidor.');
        return;
      }

      const googleEmail = authData.user?.email;
      const googleName = authData.user?.user_metadata?.full_name || authData.user?.user_metadata?.name;

      if (!googleEmail) {
        setErrorMsg('Email não retornado pelo Google.');
        return;
      }

      // Ensure profile exists
      const { data: existingProfiles, error: profError } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', googleEmail);

      if (!profError && existingProfiles.length === 0) {
        await supabase.from('profiles').insert([
          { 
            email: googleEmail, 
            name: googleName,
            user_id: authData.user?.id,
            role: 'member' 
          }
        ]);
      }
      
      onLogin(googleEmail);
    } catch (err) {
      console.error("Google Auth Exception:", err);
      setErrorMsg('Falha ao autenticar com o Google.');
    }
  };

  const handleGoogleError = () => {
    setErrorMsg('Login com Google falhou. Verifique se os cookies de terceiros estão permitidos.');
  };

  return (
    <div className="login-container">
      <div className="login-card-new">
        <button className="login-close-btn">
          <X size={20} />
        </button>

        <div className="login-tabs">
          <div 
            className={`login-tab ${!isRegistering ? 'active' : ''}`}
            onClick={() => { setIsRegistering(false); setErrorMsg(''); }}
          >
            Entrar
          </div>
          <div 
            className={`login-tab ${isRegistering ? 'active' : ''}`}
            onClick={() => { setIsRegistering(true); setErrorMsg(''); }}
          >
            Cadastre-se
          </div>
        </div>
        
        {errorMsg && <div className="login-error">{errorMsg}</div>}
        
        <form className="login-form-new" onSubmit={handleSubmit}>
          <div className="input-group-new">
            <label>Endereço de Email</label>
            <div className="input-wrapper-new">
              <input 
                type="email" 
                placeholder="Insira o endereço de email..."
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>
          
          <div className="input-group-new">
            <div className="password-header">
              <label>Senha</label>
              {!isRegistering && <a href="#" className="forgot-password">Esqueceu a senha?</a>}
            </div>
            <div className="input-wrapper-new">
              <input 
                type={showPassword ? "text" : "password"} 
                placeholder="Insira sua senha..."
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
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
          </div>
          
          <button type="submit" className={`login-button-primary ${isLoading ? 'loading' : ''}`} disabled={isLoading}>
            {isLoading ? <div className="spinner-new"></div> : (isRegistering ? "Cadastrar" : "Entrar")}
          </button>
        </form>

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
      </div>
    </div>
  );
}
