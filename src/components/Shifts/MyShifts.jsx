import React, { useState, useEffect } from 'react';
import { Clock, MapPin, Briefcase, Calendar as CalendarIcon, Loader2, AlertCircle } from 'lucide-react';
import { getShifts, getEmployeeProfiles } from '../../../services/shiftService';

export default function MyShifts({ companyId, currentUser }) {
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => {
    loadMyShifts();
  }, [companyId, currentUser, currentDate]);

  const loadMyShifts = async () => {
    try {
      setLoading(true);
      
      // We need to resolve currentUser (profiles.id) to employee_profiles.id
      const profiles = await getEmployeeProfiles(companyId);
      const myProfile = profiles.find(p => p.id === currentUser);

      if (!myProfile || !myProfile.shift_profile_id) {
          setShifts([]);
          setLoading(false);
          return;
      }

      const start = new Date(currentDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(currentDate);
      end.setDate(end.getDate() + 7); // Load next 7 days
      end.setHours(23, 59, 59, 999);

      const allShifts = await getShifts(companyId, start.toISOString(), end.toISOString());
      
      // Filter for this specific employee
      const myShifts = allShifts.filter(s => s.employee_id === myProfile.shift_profile_id);
      
      // Sort by date/time
      myShifts.sort((a, b) => new Date(a.start_time) - new Date(b.start_time));
      
      setShifts(myShifts);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getDayLabel = (dateString) => {
      const d = new Date(dateString);
      const today = new Date();
      if (d.toDateString() === today.toDateString()) return 'Hoje';
      
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      if (d.toDateString() === tomorrow.toDateString()) return 'Amanhã';

      return d.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit' });
  };

  if (loading) return <div className="p-8 text-center text-muted"><Loader2 className="animate-spin mx-auto mb-4" /> Carregando seus horários...</div>;

  const todayShifts = shifts.filter(s => new Date(s.start_time).toDateString() === new Date().toDateString());
  const futureShifts = shifts.filter(s => new Date(s.start_time).toDateString() !== new Date().toDateString());

  return (
    <div className="shifts-module-wrapper animate-fade-in max-w-4xl">
      <header className="mb-8">
        <h1 className="text-2xl font-bold">Minha Escala</h1>
        <p className="text-muted mt-1">Veja seus horários e locais de trabalho designados.</p>
      </header>

      <section className="mb-10">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><Clock className="text-accent" /> Para Hoje</h2>
          
          {todayShifts.length === 0 ? (
              <div className="bg-black/20 border border-white/5 rounded-2xl p-8 text-center">
                  <span className="text-emerald-400 font-bold block mb-2">Folga ou não escalado</span>
                  <p className="text-muted text-sm">Você não tem turnos agendados para hoje.</p>
              </div>
          ) : (
              <div className="grid grid-cols-1 gap-4">
                  {todayShifts.map(shift => {
                      const start = new Date(shift.start_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                      const end = new Date(shift.end_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                      return (
                          <div key={shift.id} className="bg-gradient-to-r from-accent/10 to-transparent border border-accent/20 rounded-2xl p-6 relative overflow-hidden">
                              <div className="absolute top-0 right-0 w-32 h-32 bg-accent/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4"></div>
                              <div className="flex flex-col md:flex-row md:justify-between md:items-center relative z-10 gap-4">
                                  <div>
                                      <h3 className="text-2xl font-bold mb-2">{start} - {end}</h3>
                                      <div className="flex items-center gap-3 text-muted text-sm">
                                          <span className="flex items-center gap-1"><MapPin size={16} className="text-accent"/> {shift.work_environments?.name}</span>
                                          <span className="flex items-center gap-1"><Briefcase size={16}/> {shift.work_activities?.name}</span>
                                      </div>
                                  </div>
                                  <div className="bg-dark/50 border border-white/10 rounded-xl px-4 py-3 flex items-center gap-3">
                                      <div className="w-2 h-2 rounded-full bg-accent animate-pulse"></div>
                                      <span className="text-sm font-bold uppercase tracking-wider">{shift.status === 'scheduled' ? 'Agendado' : shift.status}</span>
                                  </div>
                              </div>
                          </div>
                      )
                  })}
              </div>
          )}
      </section>

      <section>
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2"><CalendarIcon className="text-white/50" /> Próximos 7 Dias</h2>
          
          {futureShifts.length === 0 ? (
              <div className="text-muted text-sm">Nenhum turno agendado para a próxima semana.</div>
          ) : (
              <div className="space-y-3">
                  {futureShifts.map(shift => {
                       const start = new Date(shift.start_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                       const end = new Date(shift.end_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                       return (
                          <div key={shift.id} className="bg-black/30 border border-white/5 rounded-xl p-4 flex flex-col sm:flex-row justify-between sm:items-center gap-3 hover:bg-white/5 transition-colors">
                              <div className="w-32 font-bold text-sm text-accent capitalize">{getDayLabel(shift.start_time)}</div>
                              <div className="flex-1">
                                  <div className="font-bold">{start} - {end}</div>
                                  <div className="text-xs text-muted flex gap-3 mt-1">
                                      <span>📍 {shift.work_environments?.name}</span>
                                      <span>Trabalho: {shift.work_activities?.name}</span>
                                  </div>
                              </div>
                          </div>
                       )
                  })}
              </div>
          )}
      </section>
    </div>
  );
}
