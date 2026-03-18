import React, { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, Wand2, ChevronLeft, ChevronRight, Loader2, Trash2, Clock, MapPin, Briefcase } from 'lucide-react';
import { getShifts, getEmployeeProfiles, getEnvironments, getActivities, batchCreateShifts, deleteShift } from '../../../services/shiftService';
import { generateSmartShiftForDay, notifyShiftAssignments } from '../../../services/smartAllocationService';

export default function ShiftPlanner({ companyId, currentUser }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [shifts, setShifts] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [environments, setEnvironments] = useState([]);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    loadData();
  }, [companyId, currentDate]);

  const loadData = async () => {
    try {
      setLoading(true);
      // Load entire week to display in planner
      const start = new Date(currentDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(currentDate);
      end.setHours(23, 59, 59, 999);
      
      const [sData, eData, envData, actData] = await Promise.all([
        getShifts(companyId, start.toISOString(), end.toISOString()),
        getEmployeeProfiles(companyId),
        getEnvironments(companyId),
        getActivities(companyId)
      ]);
      setShifts(sData);
      setEmployees(eData);
      setEnvironments(envData);
      setActivities(actData);
    } catch (err) {
      console.error(err);
      alert('Erro ao carregar escalas.');
    } finally {
      setLoading(false);
    }
  };

  const handleSmartGenerate = async () => {
    if (!confirm('Deseja gerar a alocação inteligente para este dia? Escalas existentes não serão sobrepostas, mas é recomendado limpar antes.')) return;
    
    setGenerating(true);
    try {
      // Small artificial delay to show "AI processing" effect
      await new Promise(r => setTimeout(r, 1500));
      
      const drafts = generateSmartShiftForDay(
        employees, environments, activities, currentDate, 
        { companyId, authorId: currentUser }
      );

      if (drafts.length === 0) {
        alert("Não foi possível gerar escalas. Verifique as disponibilidades da equipe ou atividades cadastradas.");
      } else {
        await batchCreateShifts(drafts, companyId, currentUser);
        await notifyShiftAssignments(drafts, employees, companyId);
        await loadData();
      }
    } catch (err) {
      console.error(err);
      alert('Erro ao gerar escala automática.');
    } finally {
      setGenerating(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Excluir esta escala?')) return;
    try {
      await deleteShift(id);
      setShifts(shifts.filter(s => s.id !== id));
    } catch (err) {
      alert('Erro ao excluir escala.');
    }
  };

  const nextDay = () => setCurrentDate(new Date(currentDate.setDate(currentDate.getDate() + 1)));
  const prevDay = () => setCurrentDate(new Date(currentDate.setDate(currentDate.getDate() - 1)));

  if (loading) return <div className="p-8 text-center text-muted"><Loader2 className="animate-spin mx-auto mb-4" /> Carregando escalas...</div>;

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Header Controls */}
      <div className="flex justify-between items-center bg-black/40 p-4 rounded-xl border border-white/5">
        <div className="flex items-center gap-4">
            <button onClick={prevDay} className="p-2 bg-dark hover:bg-white/10 rounded border border-white/10"><ChevronLeft size={16} /></button>
            <div className="flex items-center gap-2 font-bold text-lg"><CalendarIcon className="text-accent" /> {currentDate.toLocaleDateString('pt-BR')}</div>
            <button onClick={nextDay} className="p-2 bg-dark hover:bg-white/10 rounded border border-white/10"><ChevronRight size={16} /></button>
        </div>
        
        <button 
          className="btn-premium bg-accent/20 border border-accent/40 text-accent hover:bg-accent hover:text-dark px-6 py-3 font-bold flex items-center gap-2 transition-all shadow-[0_0_15px_rgba(0,229,255,0.2)]"
          onClick={handleSmartGenerate} disabled={generating}
        >
          {generating ? <Loader2 className="animate-spin" size={18} /> : <Wand2 size={18} />}
          {generating ? 'IA Criando Escala...' : 'Alocação Inteligente'}
        </button>
      </div>

      {/* Grid visualization by Environment */}
      <div className="flex-1 overflow-auto bg-black/20 border border-white/5 rounded-xl p-4">
        {environments.length === 0 ? (
            <div className="text-center p-12 text-muted">Cadastre ambientes e atividades na guia correspondente primeiro.</div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {environments.map(env => {
                    const envShifts = shifts.filter(s => s.environment_id === env.id);

                    return (
                        <div key={env.id} className="bg-dark/80 rounded-xl border border-white/10 overflow-hidden flex flex-col h-[600px]">
                            <div className="bg-white/5 p-4 border-b border-white/10 flex justify-between items-center">
                                <h3 className="font-bold flex items-center gap-2"><MapPin size={16} className="text-accent"/> {env.name}</h3>
                                <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded ${envShifts.length >= env.min_coverage ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                                    {envShifts.length}/{env.min_coverage} Cobertura
                                </span>
                            </div>
                            
                            <div className="p-4 flex-1 overflow-y-auto space-y-3">
                                {envShifts.length === 0 ? (
                                    <div className="text-center text-xs text-muted py-8 border border-dashed border-white/10 rounded-xl">Sem alocações aqui hoje</div>
                                ) : (
                                    envShifts.map(shift => {
                                        // Try to find employee name from state
                                        const emp = employees.find(e => e.shift_profile_id === shift.employee_id) || { name: 'Desconhecido' };
                                        const startTime = new Date(shift.start_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                                        const endTime = new Date(shift.end_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                                        
                                        return (
                                            <div key={shift.id} className="bg-white/5 rounded-xl p-3 border border-white/5 hover:border-accent/40 relative group transition-colors">
                                                <div className="font-bold text-sm mb-1 truncate">{emp.name}</div>
                                                <div className="text-xs text-muted flex justify-between items-center">
                                                    <span className="flex items-center gap-1"><Briefcase size={12}/> {shift.work_activities?.name}</span>
                                                    <span className="flex items-center gap-1"><Clock size={12} className="text-accent"/> {startTime} - {endTime}</span>
                                                </div>
                                                <button 
                                                    onClick={() => handleDelete(shift.id)}
                                                    className="absolute top-2 right-2 p-1.5 bg-red-500/10 text-red-500 rounded hover:bg-red-500 hover:text-white opacity-0 group-hover:opacity-100 transition-all"
                                                    title="Remover da escala"
                                                >
                                                    <Trash2 size={12} />
                                                </button>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        )}
      </div>
    </div>
  );
}
