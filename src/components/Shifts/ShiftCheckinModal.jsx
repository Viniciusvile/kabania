import React, { useState, useEffect } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { MapPin, QrCode, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { supabase } from '../../supabaseClient';
import { saveActionToOfflineQueue } from '../../services/offlineSyncService';
import './ShiftsPremium.css';

export default function ShiftCheckinModal({ shift, currentUserEmail, onClose, onSuccess }) {
  const [activeTab, setActiveTab] = useState('gps'); // 'gps' | 'qr'
  const [loading, setLoading] = useState(false);
  const [profileId, setProfileId] = useState(null);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  
  // GPS State
  const [location, setLocation] = useState(null);
  
  // QR State
  const [scannerStarted, setScannerStarted] = useState(false);

  useEffect(() => {
    if (activeTab === 'qr' && !scannerStarted) {
      const scanner = new Html5QrcodeScanner("reader", { fps: 10, qrbox: {width: 250, height: 250} }, false);
      scanner.render(onScanSuccess, onScanError);
      setScannerStarted(true);
      
      return () => {
        scanner.clear().catch(console.error);
        setScannerStarted(false);
      };
    }
  }, [activeTab]);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!currentUserEmail) return;
      const { data } = await supabase.from('profiles').select('id').eq('email', currentUserEmail).single();
      if (data) setProfileId(data.id);
    };
    fetchProfile();
  }, [currentUserEmail]);

  function onScanSuccess(decodedText, decodedResult) {
    handleCheckin('qrcode', null, null, decodedText);
  }

  function onScanError(errorMessage) {
    // Ignore scan errors as they fire frame by frame
  }

  const isCheckOut = shift.status === 'in_progress' || shift.status === 'active';

  const getLocationAndCheckin = () => {
    if (!navigator.geolocation) {
      setError('Geolocalização não é suportada pelo seu navegador.');
      return;
    }
    
    setLoading(true);
    setError('');
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setLocation({ latitude, longitude });
        handleCheckin('gps', latitude, longitude, null);
      },
      (geoError) => {
        setLoading(false);
        setError('Erro ao obter localização: ' + geoError.message);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleCheckin = async (type, lat, lng, qrData) => {
    try {
      if (!profileId) throw new Error("Perfil não encontrado. Faça login novamente.");
      setLoading(true);
      setError('');
      
      const payload = {
        p_shift_id: shift.id,
        p_profile_id: profileId,
        p_company_id: shift.company_id,
        p_checkin_type: type,
        p_action_type: isCheckOut ? 'check_out' : 'check_in',
        p_latitude: lat,
        p_longitude: lng,
        p_qr_data: qrData
      };

      // Offline First Strategy
      if (!navigator.onLine) {
         console.warn("[PWA Offline] Salvando ponto na fila local...");
         const saved = saveActionToOfflineQueue('register_shift_checkin', payload);
         if (saved) {
           setSuccessMsg(isCheckOut ? 'MODO OFFLINE: Checkout salvo!' : 'MODO OFFLINE: Ponto registrado!');
           setTimeout(() => {
             if (onSuccess) onSuccess();
             onClose();
           }, 3500);
         } else {
           throw new Error("Erro ao salvar ponto offline.");
         }
         return;
      }

      const { data, error: rpcError } = await supabase.rpc('register_shift_checkin', payload);

      if (rpcError) throw rpcError;
      
      if (!data.success) {
        throw new Error(data.error || 'Falha na validação do Ponto');
      }

      if (data.status === 'rejected_distance') {
        throw new Error(`Acesso negado: Você está fora do raio permitido (${Math.round(data.distance)}m).`);
      }

      setSuccessMsg(isCheckOut ? 'Turno finalizado!' : 'Ponto registrado com sucesso!');
      setTimeout(() => {
        if (onSuccess) onSuccess();
        onClose();
      }, 2000);
      
    } catch (err) {
      setError(err.message);
    } finally {
      if (navigator.onLine) setLoading(false);
    }
  };

  return (
    <div className="modal-overlay-pixel glass-morphism" style={{ zIndex: 9999 }}>
      <div className="premium-modal-pixel animate-fade-in" style={{ width: '90%', maxWidth: '400px' }}>
        <div className="premium-modal-header border-vibrant">
          <div className="modal-header-content">
             <div className="radar-icon-box" style={{ width: '36px', height: '36px', borderRadius: '10px' }}>
                <MapPin size={18} />
             </div>
             <h3 className="text-white font-bold">{isCheckOut ? 'Finalizar Escala' : 'Registrar Início'}</h3>
          </div>
          <button className="premium-close-btn" onClick={onClose} disabled={loading}>
            <XCircle size={18} />
          </button>
        </div>

        <div className="p-6">
          {successMsg ? (
             <div className="success-lottie-premium">
               <div className="radar-icon-box" style={{ width: '80px', height: '80px', borderRadius: '50%', marginBottom: '1.5rem', background: 'rgba(16, 185, 129, 0.1)', borderColor: 'rgba(16, 185, 129, 0.3)', color: '#10b981' }}>
                  <CheckCircle size={40} className="animate-bounce" />
               </div>
               <h4 className="text-white text-xl font-bold tracking-tight">{successMsg}</h4>
               <p className="text-white/50 mt-3 text-sm">{isCheckOut ? 'Bom descanso!' : 'Tenha um ótimo turno!'}</p>
             </div>
          ) : (
            <>
              <div className="checkin-segmented-control">
                <button 
                  className={`checkin-tab-btn gps ${activeTab === 'gps' ? 'active' : ''}`}
                  onClick={() => setActiveTab('gps')}
                >
                  <MapPin size={16} /> GPS
                </button>
                <button 
                  className={`checkin-tab-btn qr ${activeTab === 'qr' ? 'active' : ''}`}
                  onClick={() => setActiveTab('qr')}
                >
                  <QrCode size={16} /> QR CODE
                </button>
              </div>

              {error && (
                <div className="checkin-error-premium">
                  <XCircle size={18} className="shrink-0 mt-0.5" />
                  <p>{error}</p>
                </div>
              )}

              {activeTab === 'gps' && (
                <div className="flex flex-col items-center">
                  <div className="radar-container">
                    <div className="radar-circle"></div>
                    <div className="radar-pulse"></div>
                    <div className="radar-pulse-2"></div>
                    <div className={`radar-icon-box ${loading ? 'checking' : ''}`}>
                       <MapPin size={40} strokeWidth={1.5} />
                    </div>
                  </div>
                  
                  <div className="text-center mb-4">
                    <h4 className="text-white font-bold text-lg mb-2">{isCheckOut ? 'Validar Localização' : 'Scanner de Presença'}</h4>
                    <p className="text-white/50 text-xs leading-relaxed max-w-[260px]">
                      {isCheckOut 
                        ? 'Confirmaremos sua posição para encerrar a jornada.' 
                        : 'O GPS validará sua presença no local designado para iniciar o turno.'}
                    </p>
                  </div>
                  
                  <button 
                    onClick={getLocationAndCheckin} 
                    disabled={loading}
                    className={`premium-checkin-btn ${isCheckOut ? 'check-out' : 'check-in'}`}
                  >
                    {loading ? (
                      <><Loader2 size={20} className="animate-spin" /> VALIDANDO...</>
                    ) : (
                      <>{isCheckOut ? 'Finalizar Escala Agora' : 'Bater Ponto Agora'}</>
                    )}
                  </button>
                </div>
              )}

              {activeTab === 'qr' && (
                <div className="flex flex-col items-center gap-4">
                   <div className="qr-scanner-frame" id="reader">
                      {!scannerStarted && <div className="flex items-center justify-center h-full text-white/20 text-xs">Inicializando câmera...</div>}
                   </div>
                   <p className="text-white/40 text-[10px] uppercase font-bold tracking-widest mt-2">
                     Aponte para o código QR
                   </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
