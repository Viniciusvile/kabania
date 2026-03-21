import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { MapPin, Clock, Calendar, CheckCircle, Activity, Loader2, User } from 'lucide-react';
import './ClientPortal.css'; // Optional styling file

export default function ClientPortal({ token }) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        // Calls the secure RPC created in Phase 4
        const { data: result, error: rpcError } = await supabase.rpc('get_public_tracking_data', { p_token: token });

        if (rpcError) throw rpcError;
        
        if (result.error) {
          setError(result.error);
        } else {
          setData(result);
        }
      } catch (err) {
        setError('Ocorreu um erro ao carregar os dados. Tente novamente.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    if (token) fetchData();
  }, [token]);

  if (loading) {
    return (
      <div className="portal-container min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white">
        <Loader2 className="animate-spin text-accent-cyan mb-4" size={48} />
        <p className="text-xl font-bold animate-pulse">Carregando andamento do serviço...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="portal-container min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white">
        <div className="max-w-md text-center p-8 glass-morphism rounded-2xl border border-red-500/20">
          <Activity className="text-red-400 mx-auto mb-4" size={48} />
          <h2 className="text-2xl font-black mb-2 text-white">Página Não Encontrada</h2>
          <p className="text-slate-400">{error || "Token inválido ou expirado."}</p>
        </div>
      </div>
    );
  }

  const { request, shifts } = data;

  const getStatusColor = (status) => {
    switch(status) {
      case 'pending': return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20';
      case 'accepted': return 'text-blue-400 bg-blue-400/10 border-blue-400/20';
      case 'in_progress': return 'text-purple-400 bg-purple-400/10 border-purple-400/20';
      case 'completed': return 'text-green-400 bg-green-400/10 border-green-400/20';
      default: return 'text-slate-400 bg-slate-400/10 border-slate-400/20';
    }
  };

  const getStatusText = (status) => {
    switch(status) {
      case 'pending': return 'Aguardando Aprovação';
      case 'accepted': return 'Aceito / Em Planejamento';
      case 'in_progress': return 'Equipe em Campo';
      case 'completed': return 'Concluído';
      default: return status;
    }
  };

  return (
    <div className="portal-container min-h-screen bg-slate-950 text-white font-sans p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
        <header className="mb-10 text-center">
          <h1 className="text-3xl font-black bg-clip-text text-transparent bg-gradient-to-r from-accent-cyan to-blue-500 mb-2">
            Acompanhamento ao Vivo
          </h1>
          <p className="text-slate-400">Portal do Cliente • Synapse Smart</p>
        </header>

        <section className="glass-morphism rounded-3xl p-6 md:p-8 border border-white/5 shadow-2xl mb-8 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-accent-cyan to-purple-500"></div>
          
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
            <div>
              <p className="text-xs text-slate-500 font-bold tracking-widest uppercase mb-1">Ordem de Serviço</p>
              <h2 className="text-2xl font-bold text-white mb-2">{request.name || "Serviço Solicitado"}</h2>
              <p className="text-slate-400 text-sm max-w-xl">{request.description}</p>
            </div>
            <div className={`px-4 py-2 rounded-xl border font-bold text-sm ${getStatusColor(request.status)}`}>
              {getStatusText(request.status)}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div className="bg-white/5 rounded-2xl p-4 flex items-center gap-4">
               <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0">
                 <MapPin className="text-blue-400" size={20} />
               </div>
               <div>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Local</p>
                  <p className="text-sm font-semibold text-slate-200">{request.environment_name || "Aguardando Definição"}</p>
               </div>
             </div>
             
             <div className="bg-white/5 rounded-2xl p-4 flex items-center gap-4">
               <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center shrink-0">
                 <Clock className="text-purple-400" size={20} />
               </div>
               <div>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Data do Pedido</p>
                  <p className="text-sm font-semibold text-slate-200">{new Date(request.created_at).toLocaleDateString('pt-BR')}</p>
               </div>
             </div>
          </div>
        </section>

        <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
           <Calendar className="text-accent-cyan" size={24} /> 
           Agendamentos & Equipe
        </h3>

        {(!shifts || shifts.length === 0) ? (
          <div className="bg-white/5 border border-white/5 rounded-3xl p-10 text-center">
            <CheckCircle className="text-slate-600 mx-auto mb-4" size={48} />
            <p className="text-slate-400">Nossa equipe está montando a grade para o seu serviço.<br/>Em breve a equipe alocada aparecerá aqui.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {shifts.map((shift, idx) => (
              <div key={idx} className="bg-white/5 border border-white/10 p-6 rounded-3xl flex flex-col md:flex-row gap-6 justify-between items-start md:items-center">
                <div>
                   <div className="flex items-center gap-2 mb-2">
                     <span className={`w-3 h-3 rounded-full ${shift.status === 'in_progress' ? 'bg-green-400 animate-pulse' : 'bg-blue-400'}`}></span>
                     <p className="text-sm font-bold text-white capitalize">{shift.status.replace('_', ' ')}</p>
                   </div>
                   <p className="text-slate-400 text-sm mb-4">
                     {new Date(shift.start_time).toLocaleString('pt-BR', { dateStyle: 'long', timeStyle: 'short' })}
                   </p>
                   
                   {shift.assigned && shift.assigned.length > 0 ? (
                     <div className="flex -space-x-3">
                       {shift.assigned.map((prof, pIdx) => (
                         <div key={pIdx} className="w-10 h-10 rounded-full border-2 border-slate-900 bg-slate-800 flex items-center justify-center overflow-hidden" title={prof.name}>
                           {prof.avatar_url ? (
                             <img src={prof.avatar_url} alt={prof.name} className="w-full h-full object-cover" />
                           ) : (
                             <User size={16} className="text-slate-400" />
                           )}
                         </div>
                       ))}
                     </div>
                   ) : (
                     <p className="text-xs text-slate-500 italic">Profissionais não definidos</p>
                   )}
                </div>
                
                {shift.status === 'in_progress' && (
                  <div className="bg-green-500/10 border border-green-500/20 px-6 py-3 rounded-2xl flex items-center gap-3">
                    <div className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                    </div>
                    <span className="text-green-400 font-bold text-sm">Equipe no Local</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
