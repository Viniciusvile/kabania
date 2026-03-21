import React from 'react';
import { Bot, CheckCircle, XCircle, Clock, Zap, AlertTriangle, AlertCircle } from 'lucide-react';

export default function AutoPilotReview({ result, onConfirm, onCancel, isProcessing }) {
  const { suggestions, errors, stats } = result;

  return (
    <div className="modal-overlay-pixel glass-morphism" style={{ zIndex: 9999 }}>
      <div className="premium-modal-pixel animate-slide-up" style={{ width: '90%', maxWidth: '650px', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
        
        <div className="premium-modal-header border-vibrant">
          <div className="flex items-center gap-3">
             <div className="icon-badge-premium bg-gradient-to-br from-indigo-500 to-purple-500">
               <Bot className="text-white" size={20} />
             </div>
             <div>
               <h3 className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400 font-bold mb-1">
                 Decisão da IA Auto-Pilot
               </h3>
               <p className="text-xs text-white/50">Simulação de malha baseada em Carga Horária e Skills</p>
             </div>
          </div>
          <button className="premium-close-btn" onClick={onCancel} disabled={isProcessing}>×</button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-white/5 border border-indigo-500/20 rounded-xl p-4 text-center">
              <span className="text-3xl font-black text-indigo-400">{stats.simulatedCount}</span>
              <p className="text-xs text-white/60 uppercase font-bold mt-1">Escalas Geradas</p>
            </div>
            <div className="bg-white/5 border border-red-500/20 rounded-xl p-4 text-center">
              <span className="text-3xl font-black text-red-400">{stats.unresolvedCount}</span>
              <p className="text-xs text-white/60 uppercase font-bold mt-1">Conflitos (Não Alocados)</p>
            </div>
          </div>

          <h4 className="text-white font-bold mb-3 flex items-center gap-2">
            <Zap size={16} className="text-yellow-400" /> Escalas Sugeridas
          </h4>
          
          {suggestions.length === 0 ? (
            <div className="text-center py-6 bg-white/5 rounded-xl border border-white/5">
              <p className="text-white/50 text-sm">Nenhuma sugestão foi gerada pela engine.</p>
            </div>
          ) : (
            <div className="space-y-3 mb-6">
              {suggestions.map((s, idx) => (
                <div key={idx} className="bg-black/30 border border-white/10 rounded-xl p-4 flex gap-4 pulse-on-hover">
                  <div className="flex-1 min-w-0">
                    <h5 className="text-white font-bold text-sm truncate mb-1">{s.activity_name}</h5>
                    <p className="text-white/60 text-xs mb-2">{s.environment_name}</p>
                    
                    <div className="flex gap-4 text-xs font-semibold">
                      <div className="flex items-center gap-1 text-indigo-300">
                        <Clock size={12} />
                        {new Date(s.start_time).toLocaleDateString()} {new Date(s.start_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </div>
                      <div className="flex items-center gap-1 text-green-400">
                        <CheckCircle size={12} /> {s.assigned_employee_name}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-col items-end justify-center">
                    <div className="text-2xl font-black bg-clip-text text-transparent bg-gradient-to-r from-green-400 to-emerald-500">
                      {s.confidence}%
                    </div>
                    <span className="text-[10px] text-white/40 uppercase font-bold tracking-wider">Confiança</span>
                    <div className={`text-[10px] font-bold px-2 py-0.5 mt-1 rounded ${s.worker_utilization_percent > 90 ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/20 text-blue-400'}`}>
                      Carga: {s.worker_utilization_percent}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {errors.length > 0 && (
            <>
              <h4 className="text-red-400 font-bold mb-3 flex items-center gap-2">
                <AlertCircle size={16} /> Não puderam ser alocados
              </h4>
              <ul className="list-disc pl-5 text-xs text-white/70 space-y-1 mb-6">
                {errors.map((e, idx) => <li key={idx}>{e}</li>)}
              </ul>
            </>
          )}

          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 flex gap-3 text-sm">
             <AlertTriangle className="text-yellow-500 shrink-0 mt-0.5" size={18} />
             <p className="text-yellow-200/80">
               Ao aprovar, todas as {stats.simulatedCount} escalas sugeridas serão enviadas para os respectivos colaboradores e marcadas no banco de dados.
             </p>
          </div>
        </div>

        <div className="premium-modal-footer p-4 border-t border-white/10 flex justify-end gap-3 bg-black/40">
          <button 
            type="button" 
            className="glow-btn-ghost py-2" 
            onClick={onCancel}
            disabled={isProcessing}
          >
            Descartar IA
          </button>
          
          <button 
            type="button" 
            className={`py-2 px-6 rounded-lg font-bold shadow-lg flex items-center gap-2 transition-all ${suggestions.length === 0 ? 'bg-white/10 text-white/30 cursor-not-allowed' : 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:from-indigo-400 hover:to-purple-500 hover:shadow-indigo-500/25'}`}
            onClick={() => suggestions.length > 0 && onConfirm(suggestions)}
            disabled={isProcessing || suggestions.length === 0}
          >
             {isProcessing ? 'Gravando...' : 'Aprovar Lote Completo 🚀'}
          </button>
        </div>
      </div>
    </div>
  );
}
