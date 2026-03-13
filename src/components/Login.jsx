import React, { useState } from 'react';
import { X, EyeOff, Eye } from 'lucide-react';
import { GoogleLogin } from '@react-oauth/google';
import { supabase } from '../supabaseClient';
import './Login.css';

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
        const { error } = await supabase.from('profiles').insert([
          { email, password, role: 'member' }
        ]);
        
        if (error) {
          setErrorMsg(errorMap[error.code] || 'Erro ao cadastrar: ' + error.message);
          setIsLoading(false);
          return;
        }
        onLogin(email);
      } else {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('email', email)
          .eq('password', password)
          .single();

        if (error || !data) {
          setErrorMsg('Email ou senha incorretos.');
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
      const payload = JSON.parse(atob(credentialResponse.credential.split('.')[1]));
      const googleEmail = payload.email;
      const googleName  = payload.name;

      // Upsert profile
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', googleEmail);

      if (!error && (data.length === 0)) {
        await supabase.from('profiles').insert([
          { email: googleEmail, password: 'google-oauth', name: googleName }
        ]);
      }
      onLogin(googleEmail);
    } catch (err) {
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
