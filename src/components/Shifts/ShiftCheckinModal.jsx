import React, { useState, useEffect } from 'react';
import { 
  MapPin, QrCode, Clock, CheckCircle, XCircle, 
  Scan, Navigation, ArrowRight, ShieldCheck, Zap, Loader2
} from 'lucide-react';
import { supabase } from '../../supabaseClient';
import './ShiftsPremium.css';

const RADAR_PULSE_SVG = (
  <svg className="radar-svg" viewBox="0 0 100 100">
    <circle cx="50" cy="50" r="10" className="radar-center" />
    <circle cx="50" cy="50" r="20" className="radar-ring r1" />
    <circle cx="50" cy="50" r="40" className="radar-ring r2" />
    <circle cx="50" cy="50" r="60" className="radar-ring r3" />
  </svg>
);

export default function ShiftCheckinModal({ shift, currentUserEmail, onClose, onSuccess }) {
  const [activeTab, setActiveTab] = useState('gps');
  const [loading, setLoading] = useState(false);
  const [profileId, setProfileId] = useState(null);
  const [error, setError] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());
  
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!currentUserEmail) return;
      const { data } = await supabase.from('profiles').select('id').eq('email', currentUserEmail).single();
      if (data) setProfileId(data.id);
    };
    fetchProfile();
  }, [currentUserEmail]);

  const hasIn = !!shift.check_in_time;
  const hasOut = !!shift.check_out_time;
  const isCheckOut = hasIn && !hasOut;

  const handleAction = async (actionType) => {
    if (!profileId) return;
    setLoading(true);
    setError('');
    
    // Simulate some "scanning" feedback
    await new Promise(r => setTimeout(r, 1200));

    try {
      const payload = {
        p_shift_id: shift.id,
        p_profile_id: profileId,
        p_company_id: shift.company_id,
        p_checkin_type: activeTab,
        p_action_type: actionType,
        p_latitude: -23.5505,
        p_longitude: -46.6333
      };

      const { error: rpcError } = await supabase.rpc('register_shift_checkin', payload);
      if (rpcError) throw rpcError;

      if (onSuccess) onSuccess();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const AGENDA_STEPS = [
    { label: 'Entrada', time: shift.check_in_time || shift.start_time, done: hasIn, active: !hasIn },
    { label: 'Intervalo', time: '--:--', done: false, active: false, disabled: true },
    { label: 'Retorno', time: '--:--', done: false, active: false, disabled: true },
    { label: 'Saída', time: shift.check_out_time || shift.end_time, done: hasOut, active: hasIn && !hasOut }
  ];

  return (
    <div className="premium-modal-pixel animate-slide-up">
      {/* Header Atmospheric */}
      <div className="ponto-nebula-header">
        <div className="header-noise" />
        <div className="flex justify-between items-start relative z-10 w-full">
          <div className="ponto-branding">
            <span className="text-[10px] font-black tracking-[0.2em] opacity-50 uppercase">Synapse Ponto</span>
            <h2 className="text-xl font-black mt-1">Status do Turno</h2>
          </div>
          <button onClick={onClose} className="ponto-close-btn"><XCircle size={20} /></button>
        </div>

        <div className="ponto-clock-container relative z-10">
          <div className="ponto-digital-clock">
            {currentTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </div>
          <div className="ponto-date-label">
            {currentTime.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'short' })}
          </div>
        </div>
      </div>

      <div className="modal-body-scrollable">
        {/* Agenda Timeline */}
        <section className="ponto-agenda-section">
          <div className="section-tag flex items-center gap-2 mb-6">
            <Clock size={12} className="text-cyan-400" />
            <span>AGENDA DO DIA</span>
          </div>
          
          <div className="ponto-timeline">
            {AGENDA_STEPS.map((step, idx) => (
              <div key={idx} className={`timeline-row ${step.done ? 'is-done' : ''} ${step.active ? 'is-active' : ''} ${step.disabled ? 'is-disabled' : ''}`}>
                <div className="timeline-marker">
                   <div className="marker-dot" />
                   {idx < 3 && <div className="marker-line" />}
                </div>
                <div className="timeline-content">
                   <span className="step-label">{step.label}</span>
                   <span className="step-time">{step.time ? new Date(step.time).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : '--:--'}</span>
                </div>
                {step.done && <ShieldCheck size={16} className="text-emerald-400" />}
              </div>
            ))}
          </div>
        </section>

        {/* Validation Surface */}
        <section className="ponto-validation-area">
          <div className="tabs-dock-premium">
            <button onClick={() => setActiveTab('gps')} className={`tab-pill ${activeTab === 'gps' ? 'active' : ''}`}>
              <Navigation size={14} /> GPS
            </button>
            <button onClick={() => setActiveTab('qr')} className={`tab-pill ${activeTab === 'qr' ? 'active' : ''}`}>
              <Scan size={14} /> QR SCAN
            </button>
          </div>

          <div className="ponto-radar-surface">
            {activeTab === 'gps' ? (
              <div className="radar-container">
                {RADAR_PULSE_SVG}
                <div className="radar-status">
                  <MapPin size={24} className="text-cyan-400 animate-bounce" />
                  <span className="text-[10px] font-bold mt-2 uppercase tracking-widest text-cyan-500/80">Localizando...</span>
                </div>
              </div>
            ) : (
              <div className="qr-box-mock">
                <div className="qr-corners" />
                <QrCode size={48} className="opacity-10" />
                <span className="text-[10px] font-bold mt-4 opacity-40">AGUARDANDO CÓDIGO</span>
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Action Footer */}
      <div className="ponto-footer-dock">
         <button 
           className="btn-ponto-action btn-oi" 
           disabled={loading || hasIn}
           onClick={() => handleAction('check_in')}
         >
           {loading ? <Loader2 className="animate-spin" /> : <Zap size={20} />}
           <div className="flex flex-col items-start leading-none gap-1">
             <span className="text-[14px] font-black">OI</span>
             <span className="text-[9px] opacity-60 uppercase">Check-in</span>
           </div>
         </button>

         <button 
           className="btn-ponto-action btn-tchau"
           disabled={loading || !hasIn || hasOut}
           onClick={() => handleAction('check_out')}
         >
           <ArrowRight size={20} />
           <div className="flex flex-col items-start leading-none gap-1">
             <span className="text-[14px] font-black">TCHAU</span>
             <span className="text-[9px] opacity-60 uppercase">Check-out</span>
           </div>
         </button>
      </div>

      {error && <div className="absolute bottom-4 left-4 right-4 p-3 bg-red-500/20 border border-red-500/40 rounded-xl text-red-200 text-xs text-center z-50 backdrop-blur-md">{error}</div>}
    </div>
  );
}
