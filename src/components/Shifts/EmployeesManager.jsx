import React, { useState, useEffect } from 'react';
import { Users, Clock, Shield, Save, Loader2, AlertCircle } from 'lucide-react';
import { getEmployeeProfiles, updateEmployeeProfile } from '../../services/shiftService';

export default function EmployeesManager({ companyId }) {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(null);

  useEffect(() => {
    loadData();
  }, [companyId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await getEmployeeProfiles(companyId);
      setEmployees(data);
    } catch (err) {
      console.error(err);
      alert('Erro ao carregar colaboradores.');
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (emp) => {
    setEditingId(emp.id);
    setEditForm({
      role: emp.role || 'Geral',
      max_daily_hours: emp.max_daily_hours || 8,
      max_weekly_hours: emp.max_weekly_hours || 44,
      availability_schedule: emp.availability_schedule || {}
    });
  };

  const handleSave = async (profileId) => {
    try {
      await updateEmployeeProfile(profileId, companyId, editForm);
      await loadData();
      setEditingId(null);
    } catch(err) {
      console.error(err);
      alert("Erro ao atualizar!");
    }
  };

  const toggleDay = (day) => {
    setEditForm(prev => {
      const schedule = { ...prev.availability_schedule };
      if (schedule[day]) {
         delete schedule[day];
      } else {
         schedule[day] = ["08:00", "18:00"]; // default full day availability
      }
      return { ...prev, availability_schedule: schedule };
    });
  };

  const daysLabels = [
    { key: 'monday', label: 'Segunda' },
    { key: 'tuesday', label: 'Terça' },
    { key: 'wednesday', label: 'Quarta' },
    { key: 'thursday', label: 'Quinta' },
    { key: 'friday', label: 'Sexta' },
    { key: 'saturday', label: 'Sábado' },
    { key: 'sunday', label: 'Domingo' }
  ];

  if (loading) return <div className="p-8 text-center text-muted"><Loader2 className="animate-spin mx-auto mb-4" /> Carregando equipe...</div>;

  return (
    <div className="shift-card">
      <div className="shift-card-header">
        <h2 className="text-xl font-bold flex items-center gap-2"><Users size={20} className="text-accent" /> Equipe e Capacidade</h2>
        <p className="text-sm text-muted">Defina cargos e disponibilidade para alocação inteligente.</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-white/10 text-xs text-muted">
              <th className="pb-3 font-semibold">Funcionário</th>
              <th className="pb-3 font-semibold">Cargo na Escala</th>
              <th className="pb-3 font-semibold">Limite Horas (Dia/Sem)</th>
              <th className="pb-3 font-semibold">Dias Disponíveis</th>
              <th className="pb-3 font-semibold text-right">Ação</th>
            </tr>
          </thead>
          <tbody>
            {employees.map(emp => {
              const isEditing = editingId === emp.id;
              
              return (
                <tr key={emp.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                  <td className="py-4">
                    <div className="font-bold text-sm">{emp.name}</div>
                    <div className="text-xs text-muted">{emp.email}</div>
                  </td>
                  
                  <td className="py-4">
                    {isEditing ? (
                      <input 
                        className="bg-dark border border-white/10 rounded px-3 py-1 text-sm w-32" 
                        value={editForm.role} onChange={e => setEditForm({...editForm, role: e.target.value})}
                      />
                    ) : (
                      <span className="bg-white/10 text-white/90 text-[10px] uppercase font-bold px-2 py-1 rounded">{emp.role}</span>
                    )}
                  </td>
                  
                  <td className="py-4">
                    {isEditing ? (
                      <div className="flex items-center gap-2">
                        <input 
                          type="number" className="bg-dark border border-white/10 rounded px-2 py-1 text-sm w-16 text-center" 
                          value={editForm.max_daily_hours} onChange={e => setEditForm({...editForm, max_daily_hours: Number(e.target.value)})} title="Diário"
                        />
                        <span className="text-muted">/</span>
                        <input 
                          type="number" className="bg-dark border border-white/10 rounded px-2 py-1 text-sm w-16 text-center" 
                          value={editForm.max_weekly_hours} onChange={e => setEditForm({...editForm, max_weekly_hours: Number(e.target.value)})} title="Semanal"
                        />
                      </div>
                    ) : (
                      <span className="text-sm text-white/80"><Clock size={12} className="inline mr-1 text-accent"/> {emp.max_daily_hours}h dia / {emp.max_weekly_hours}h sem</span>
                    )}
                  </td>

                  <td className="py-4">
                    {isEditing ? (
                      <div className="flex gap-1">
                        {daysLabels.map(d => {
                            const active = editForm.availability_schedule[d.key];
                            return (
                                <button key={d.key} 
                                   onClick={() => toggleDay(d.key)} 
                                   className={`w-7 h-7 rounded-sm text-[10px] font-bold ${active ? 'bg-accent text-dark' : 'bg-dark text-muted border border-white/10'}`}
                                   title={d.label}>
                                   {d.label.substring(0,1)}
                                </button>
                            );
                        })}
                      </div>
                    ) : (
                      <div className="flex gap-1 break-words max-w-[200px]">
                        {Object.keys(emp.availability_schedule).length > 0 ? (
                            Object.keys(emp.availability_schedule).map(key => {
                                const dayObj = daysLabels.find(d => d.key === key);
                                return <span key={key} className="text-[10px] bg-accent/20 text-accent px-1.5 py-0.5 rounded">{dayObj?.label.substring(0,3)}</span>;
                            })
                        ) : <span className="text-xs text-red-400">Sem dias def.</span>}
                      </div>
                    )}
                  </td>

                  <td className="py-4 text-right">
                    {isEditing ? (
                      <div className="flex items-center justify-end gap-2">
                          <button className="text-xs text-muted hover:text-white" onClick={() => setEditingId(null)}>Cancelar</button>
                          <button className="flex items-center gap-1 bg-accent text-dark text-xs font-bold px-3 py-1.5 rounded hover:brightness-110" onClick={() => handleSave(emp.id)}>
                            <Save size={12} /> Salvar
                          </button>
                      </div>
                    ) : (
                      <button className="text-xs text-accent hover:text-white underline decoration-transparent hover:decoration-white transition-all" onClick={() => handleEditClick(emp)}>
                        Configurar
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
