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

  const getLocationAndCheckin = () => {
    if (!navigator.geolocation) {
      setError('Geolocalização não é suportada pelo seu navegador.');
      return;
    }
    
    setLoading(true);
    setError('');
    
    // High accuracy ensures better GPS parsing
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
        p_action_type: 'check_in',
        p_latitude: lat,
        p_longitude: lng,
        p_qr_data: qrData
      };

      // Offline First Strategy
      if (!navigator.onLine) {
         console.warn("[PWA Offline] Salvando check-in na fila local...");
         const saved = saveActionToOfflineQueue('register_shift_checkin', payload);
         if (saved) {
           setSuccessMsg('MODO OFFLINE: Ponto salvo no celular. Será enviado quando houver internet!');
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
        throw new Error(data.error || 'Falha na validação do Check-in');
      }

      if (data.status === 'rejected_distance') {
        throw new Error(`Acesso negado: Você está fora do raio permitido do Ambiente de Trabalho (${Math.round(data.distance)}m). Vá até o local para bater o ponto.`);
      }

      setSuccessMsg('Ponto registrado com sucesso na nuvem!');
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
             <div className="header-icon-box" style={{ padding: '0.5rem', borderRadius: '0.75rem' }}>
               <MapPin className="text-accent-cyan" size={20} />
             </div>
             <h3 className="text-white font-bold tracking-tight">Registrar Ponto Eletrônico</h3>
          </div>
          <button className="premium-close-btn text-white/40 hover:text-white transition-colors" onClick={onClose} disabled={loading}>
            <XCircle size={20} />
          </button>
        </div>

        <div className="p-6">
          {successMsg ? (
             <div className="text-center py-8">
               <CheckCircle size={48} className="text-green-400 mx-auto mb-4" />
               <h4 className="text-white text-xl font-bold">{successMsg}</h4>
               <p className="text-white/60 mt-2">Tenha um ótimo turno!</p>
             </div>
          ) : (
            <>
              <div className="inventory-tabs w-full flex" style={{ display: 'flex', gap: '8px', marginBottom: '36px', background: 'rgba(255, 255, 255, 0.03)', padding: '8px', borderRadius: '16px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                <button 
                  className={`tab-btn flex-1 flex justify-center items-center gap-2`}
                  onClick={() => setActiveTab('gps')}
                  style={{ flex: 1, padding: '12px', borderRadius: '12px', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontWeight: 'bold', fontSize: '0.9rem', background: activeTab === 'gps' ? 'rgba(0, 229, 255, 0.1)' : 'transparent', color: activeTab === 'gps' ? 'var(--accent-cyan)' : 'var(--text-muted)', border: activeTab === 'gps' ? '1px solid rgba(0, 229, 255, 0.2)' : '1px solid transparent', boxShadow: activeTab === 'gps' ? '0 4px 12px rgba(0, 229, 255, 0.1)' : 'none' }}
                >
                  <MapPin size={18} /> GPS Check-in
                </button>
                <button 
                  className={`tab-btn flex-1 flex justify-center items-center gap-2`}
                  onClick={() => setActiveTab('qr')}
                  style={{ flex: 1, padding: '12px', borderRadius: '12px', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontWeight: 'bold', fontSize: '0.9rem', background: activeTab === 'qr' ? 'rgba(167, 139, 250, 0.1)' : 'transparent', color: activeTab === 'qr' ? '#a78bfa' : 'var(--text-muted)', border: activeTab === 'qr' ? '1px solid rgba(167, 139, 250, 0.2)' : '1px solid transparent', boxShadow: activeTab === 'qr' ? '0 4px 12px rgba(167, 139, 250, 0.1)' : 'none' }}
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
                  <div style={{ padding: '28px', borderRadius: '50%', background: 'rgba(0, 229, 255, 0.05)', border: '1px solid rgba(0, 229, 255, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', boxShadow: '0 10px 30px rgba(0, 229, 255, 0.1)' }}>
                     <MapPin size={46} className="text-accent-cyan" strokeWidth={1.5} />
                     {loading && (
                       <div className="absolute inset-[-4px] border-2 border-transparent border-t-accent-cyan rounded-3xl animate-spin" style={{ position: 'absolute', top: '-4px', left: '-4px', right: '-4px', bottom: '-4px', border: '2px solid transparent', borderTopColor: 'var(--accent-cyan)', borderWidth: '2px', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                     )}
                     <div className="pulse-dot" style={{ position: 'absolute', top: '8px', right: '8px', width: '12px', height: '12px', background: 'var(--accent-cyan)', borderRadius: '50%', boxShadow: '0 0 10px var(--accent-cyan)' }}></div>
                  </div>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <h4 style={{ color: 'white', fontWeight: 'bold', fontSize: '1.25rem', margin: 0, letterSpacing: '-0.02em' }}>Validação por Geofencing</h4>
                    <p style={{ fontSize: '0.9rem', color: 'rgba(255, 255, 255, 0.6)', maxWidth: '280px', margin: 0, lineHeight: 1.6 }}>
                      O sistema usará o GPS para garantir que você está perto do <strong style={{ color: 'rgba(255, 255, 255, 0.9)' }}>Ambiente de Trabalho</strong>.
                    </p>
                  </div>
                  
                  <button 
                    onClick={getLocationAndCheckin} 
                    disabled={loading}
                    className="glow-btn-primary"
                    style={{ padding: '16px', fontSize: '1.05rem', width: '100%', display: 'flex', justifyContent: 'center', gap: '12px', marginTop: '8px', borderRadius: '16px', letterSpacing: '0.02em' }}
                  >
                    {loading ? <><Loader2 size={24} className="animate-spin" /> Verificando...</> : 'Bater Ponto Agora'}
                  </button>
                </div>
              )}

              {activeTab === 'qr' && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                   <p style={{ fontSize: '0.85rem', color: 'rgba(255, 255, 255, 0.6)', margin: '0 0 16px 0', lineHeight: 1.5 }}>
                     Aponte a câmera para o QR Code afixado no Ambiente de Trabalho.
                   </p>
                   <div id="reader" className="rounded-xl overflow-hidden border border-white/10 bg-black/40"></div>
                   {loading && (
                     <div className="mt-4 flex items-center justify-center gap-2 text-accent-cyan">
                       <Loader2 size={16} className="animate-spin" /> Processando leitura...
                     </div>
                   )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
