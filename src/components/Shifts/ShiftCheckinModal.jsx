import React, { useState, useEffect } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { MapPin, QrCode, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { supabase } from '../../supabaseClient';
import { saveActionToOfflineQueue } from '../../services/offlineSyncService';
import '../Inventory/InventoryModule.css';
import './ShiftsRedesign.css';

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
    // Usually ignore, it fires every frame it doesn't find a code
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
           setSuccessMsg(isCheckOut ? 'MODO OFFLINE: Checkout salvo no celular!' : 'MODO OFFLINE: Ponto salvo no celular!');
           setTimeout(() => {
             if (onSuccess) onSuccess();
             onClose();
           }, 3500);
         } else {
           throw new Error("Erro de memória no celular ao salvar ponto offline.");
         }
         return;
      }

      const { data, error: rpcError } = await supabase.rpc('register_shift_checkin', payload);

      if (rpcError) throw rpcError;
      
      if (!data.success) {
        throw new Error(data.error || 'Falha na validação do Ponto');
      }

      if (data.status === 'rejected_distance') {
        throw new Error(`Acesso negado: Você está fora do raio permitido (${Math.round(data.distance)}m). Vá até o local para bater o ponto.`);
      }

      setSuccessMsg(isCheckOut ? 'Turno finalizado com sucesso!' : 'Ponto registrado com sucesso!');
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
      <div className="premium-modal-pixel animate-fade-in glass-morphism" style={{ width: '90%', maxWidth: '400px', border: '1px solid var(--border-light)' }}>
        <div className="premium-modal-header border-vibrant" style={{ padding: '1.25rem 1.5rem' }}>
          <div className="flex items-center gap-3">
             <div className="header-icon-box" style={{ padding: '0.5rem', borderRadius: '0.75rem', background: isCheckOut ? 'rgba(251, 191, 36, 0.1)' : 'rgba(0, 229, 255, 0.1)' }}>
                <MapPin className={isCheckOut ? "text-amber-400" : "text-accent-cyan"} size={20} />
             </div>
             <h3 className="text-white font-bold tracking-tight">{isCheckOut ? 'Finalizar Escala' : 'Registrar Início'}</h3>
          </div>
          <button className="premium-close-btn text-white/40 hover:text-white transition-colors" onClick={onClose} disabled={loading}>
            <XCircle size={20} />
          </button>
        </div>

        <div className="p-6">
          {successMsg ? (
             <div className="text-center py-8">
               <CheckCircle size={48} className={isCheckOut ? "text-amber-400 mx-auto mb-4" : "text-green-400 mx-auto mb-4"} />
               <h4 className="text-white text-xl font-bold">{successMsg}</h4>
               <p className="text-white/60 mt-2">{isCheckOut ? 'Bom descanso e até a próxima!' : 'Tenha um ótimo turno!'}</p>
             </div>
          ) : (
            <>
              <div className="inventory-tabs w-full flex" style={{ display: 'flex', gap: '8px', marginBottom: '36px', background: 'rgba(255, 255, 255, 0.03)', padding: '8px', borderRadius: '16px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                <button 
                  className={`tab-btn flex-1 flex justify-center items-center gap-2`}
                  onClick={() => setActiveTab('gps')}
                  style={{ flex: 1, padding: '12px', borderRadius: '12px', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontWeight: 'bold', fontSize: '0.9rem', background: activeTab === 'gps' ? (isCheckOut ? 'rgba(251, 191, 36, 0.1)' : 'rgba(0, 229, 255, 0.1)') : 'transparent', color: activeTab === 'gps' ? (isCheckOut ? '#fbbf24' : 'var(--accent-cyan)') : 'var(--text-muted)', border: activeTab === 'gps' ? (isCheckOut ? '1px solid rgba(251, 191, 36, 0.2)' : '1px solid rgba(0, 229, 255, 0.2)') : '1px solid transparent' }}
                >
                  <MapPin size={18} /> {isCheckOut ? 'GPS Checkout' : 'GPS Check-in'}
                </button>
                <button 
                  className={`tab-btn flex-1 flex justify-center items-center gap-2`}
                  onClick={() => setActiveTab('qr')}
                  style={{ flex: 1, padding: '12px', borderRadius: '12px', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontWeight: 'bold', fontSize: '0.9rem', background: activeTab === 'qr' ? 'rgba(167, 139, 250, 0.1)' : 'transparent', color: activeTab === 'qr' ? '#a78bfa' : 'var(--text-muted)', border: activeTab === 'qr' ? '1px solid rgba(167, 139, 250, 0.2)' : '1px solid transparent' }}
                >
                  <QrCode size={18} /> QR Code
                </button>
              </div>

              {error && (
                <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-start gap-3">
                  <XCircle size={18} className="shrink-0 mt-0.5" />
                  <p>{error}</p>
                </div>
              )}

              {activeTab === 'gps' && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '28px' }}>
                  <div style={{ padding: '28px', borderRadius: '50%', background: isCheckOut ? 'rgba(251, 191, 36, 0.05)' : 'rgba(0, 229, 255, 0.05)', border: isCheckOut ? '1px solid rgba(251, 191, 36, 0.15)' : '1px solid rgba(0, 229, 255, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                     <MapPin size={46} className={isCheckOut ? "text-amber-400" : "text-accent-cyan"} strokeWidth={1.5} />
                     {loading && (
                        <div className="absolute inset-[-4px] border-2 border-transparent border-t-accent-cyan rounded-3xl animate-spin" style={{ position: 'absolute', top: '-4px', left: '-4px', right: '-4px', bottom: '-4px', border: '2px solid transparent', borderTopColor: isCheckOut ? '#fbbf24' : 'var(--accent-cyan)', borderWidth: '2px', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                     )}
                     <div className="pulse-dot" style={{ position: 'absolute', top: '8px', right: '8px', width: '12px', height: '12px', background: isCheckOut ? '#fbbf24' : 'var(--accent-cyan)', borderRadius: '50%', boxShadow: isCheckOut ? '0 0 10px #fbbf24' : '0 0 10px var(--accent-cyan)' }}></div>
                  </div>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <h4 style={{ color: 'white', fontWeight: 'bold', fontSize: '1.25rem', margin: 0 }}>{isCheckOut ? 'Checkout por GPS' : 'Check-in por GPS'}</h4>
                    <p style={{ fontSize: '0.9rem', color: 'rgba(255, 255, 255, 0.6)', maxWidth: '280px', margin: 0, lineHeight: 1.6 }}>
                      O sistema garantirá que você está no local para <strong style={{ color: 'rgba(255, 255, 255, 0.9)' }}>{isCheckOut ? 'encerrar' : 'validar o início do'} seu turno</strong>.
                    </p>
                  </div>
                  
                  <button 
                    onClick={getLocationAndCheckin} 
                    disabled={loading}
                    className={isCheckOut ? "glow-btn-checkout" : "glow-btn-primary"}
                    style={{ 
                      padding: '16px', 
                      fontSize: '1.05rem', 
                      width: '100%', 
                      display: 'flex', 
                      justifyContent: 'center', 
                      gap: '12px', 
                      marginTop: '8px', 
                      borderRadius: '16px',
                      background: isCheckOut ? 'linear-gradient(135deg, #f59e0b, #ea580c)' : undefined,
                      border: 'none',
                      color: 'white',
                      fontWeight: 'bold',
                      cursor: loading ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {loading ? <><Loader2 size={24} className="animate-spin" /> Verificando...</> : (isCheckOut ? 'Finalizar Escala Agora' : 'Bater Ponto Agora')}
                  </button>
                </div>
              )}

              {activeTab === 'qr' && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                   <p style={{ fontSize: '0.85rem', color: 'rgba(255, 255, 255, 0.6)', margin: '0 0 16px 0', lineHeight: 1.5 }}>
                     {isCheckOut ? 'Leia o QR Code para confirmar sua saída.' : 'Leia o QR Code para confirmar sua entrada.'}
                   </p>
                   <div id="reader" className="rounded-xl overflow-hidden border border-white/10 bg-black/40 w-full" style={{ minHeight: '200px' }}></div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
      <style>{`
        .glow-btn-checkout {
          box-shadow: 0 4px 20px rgba(234, 88, 12, 0.4);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .glow-btn-checkout:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(234, 88, 12, 0.6);
          filter: brightness(1.1);
        }
        .glow-btn-checkout:active:not(:disabled) {
          transform: translateY(0);
        }
      `}</style>
    </div>
  );
}
