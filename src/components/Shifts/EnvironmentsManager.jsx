import React, { useState, useEffect } from 'react';
import { MapPin, Plus, Trash2, Briefcase, PlusCircle, Loader2 } from 'lucide-react';
import { getWorkEnvironments, createWorkEnvironment, createWorkActivity, deleteWorkEnvironment, deleteWorkActivity } from '../../services/shiftService';

export default function EnvironmentsManager({ companyId }) {
  const [environments, setEnvironments] = useState([]);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  // Forms
  const [showEnvForm, setShowEnvForm] = useState(false);
  const [newEnv, setNewEnv] = useState({ name: '', min_coverage: 1 });

  const [showActForm, setShowActForm] = useState(false);
  const [newAct, setNewAct] = useState({ environment_id: '', name: '', required_role: 'Qualquer', duration_minutes: 60 });

  useEffect(() => {
    loadData();
  }, [companyId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [envs, acts] = await Promise.all([
        getWorkEnvironments(companyId),
        getActivities(companyId)
      ]);
      setEnvironments(envs);
      setActivities(acts);
    } catch (err) {
      console.error(err);
      alert('Erro ao carregar dados dos ambientes.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddEnv = async (e) => {
    e.preventDefault();
    if (!newEnv.name) return;
    try {
      const added = await createWorkEnvironment({ ...newEnv, company_id: companyId });
      setEnvironments([...environments, added]);
      setNewEnv({ name: '', min_coverage: 1 });
      setShowEnvForm(false);
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar ambiente.');
    }
  };

  const handleAddAct = async (e) => {
    e.preventDefault();
    if (!newAct.name || !newAct.environment_id) return;
    try {
      const added = await createWorkActivity({ ...newAct, company_id: companyId });
      // Reload activities to get joined environment name
      const acts = await getActivities(companyId);
      setActivities(acts);
      setNewAct({ environment_id: '', name: '', required_role: 'Qualquer', duration_minutes: 60 });
      setShowActForm(false);
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar atividade.');
    }
  };

  if (loading) return <div className="p-8 text-center text-muted"><Loader2 className="animate-spin mx-auto mb-4" /> Carregando base de dados...</div>;

  return (
    <div className="flex gap-6 h-full">
      {/* Environments List */}
      <div className="shift-card flex-1">
        <div className="shift-card-header">
          <h2 className="text-xl font-bold flex items-center gap-2"><MapPin size={20} className="text-accent" /> Ambientes de Trabalho</h2>
          <button className="btn-premium btn-premium-primary text-xs py-2 px-4" onClick={() => setShowEnvForm(!showEnvForm)}>
            <Plus size={14} /> Novo Ambiente
          </button>
        </div>

        {showEnvForm && (
          <form onSubmit={handleAddEnv} className="premium-form-container animate-slide-up">
            <div className="flex gap-4 mb-4">
              <input 
                type="text" placeholder="Nome do Ambiente (ex: Recepção)" className="premium-input-field flex-1" 
                value={newEnv.name} onChange={e => setNewEnv({...newEnv, name: e.target.value})} required 
              />
              <input 
                type="number" placeholder="Cobertura Mínima" className="premium-input-field w-40" 
                min="1" value={newEnv.min_coverage} onChange={e => setNewEnv({...newEnv, min_coverage: parseInt(e.target.value)})} title="Cobertura Mínima de Funcionários" required 
              />
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" className="text-xs text-muted hover:text-white px-3 py-1" onClick={() => setShowEnvForm(false)}>Cancelar</button>
              <button type="submit" className="bg-accent text-dark font-bold text-xs px-4 py-2 rounded-lg hover:brightness-110">Salvar</button>
            </div>
          </form>
        )}

        <div className="space-y-3">
          {environments.length === 0 ? <p className="text-muted text-sm text-center py-4">Nenhum ambiente cadastrado.</p> : environments.map(env => (
            <div key={env.id} className="p-4 bg-black/20 border border-white/5 rounded-xl flex justify-between items-center hover:border-accent/30 transition-colors">
              <div>
                <h3 className="font-bold">{env.name}</h3>
                <p className="text-xs text-muted mt-1">Cobertura mínima recomendada: <span className="text-accent font-bold">{env.min_coverage}</span> funcionário(s)</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Activities List */}
      <div className="shift-card flex-1">
        <div className="shift-card-header">
          <h2 className="text-xl font-bold flex items-center gap-2"><Briefcase size={20} className="text-blue-400" /> Atividades por Ambiente</h2>
          <button className="btn-premium bg-blue-500/20 text-blue-400 border border-blue-500/30 text-xs py-2 px-4 hover:bg-blue-500/30" onClick={() => setShowActForm(!showActForm)}>
            <Plus size={14} /> Nova Atividade
          </button>
        </div>

        {showActForm && (
          <form onSubmit={handleAddAct} className="premium-form-container animate-slide-up">
            <select 
              className="w-full mb-3 premium-input-field"
              value={newAct.environment_id} onChange={e => setNewAct({...newAct, environment_id: e.target.value})} required
            >
              <option value="">Selecione o Ambiente...</option>
              {environments.map(env => <option key={env.id} value={env.id}>{env.name}</option>)}
            </select>
            
            <input 
              type="text" placeholder="Nome da Atividade (ex: Triagem de Clientes)" className="w-full mb-3 premium-input-field" 
              value={newAct.name} onChange={e => setNewAct({...newAct, name: e.target.value})} required 
            />
            
            <div className="flex gap-3 mb-4">
              <input 
                type="text" placeholder="Cargo Exigido (ex: Recepcionista)" className="flex-1 premium-input-field text-sm" 
                value={newAct.required_role} onChange={e => setNewAct({...newAct, required_role: e.target.value})} title="Cargo exigido (Deixe Qualquer se livre)"
              />
               <input 
                type="number" placeholder="Duração (min)" className="w-32 premium-input-field text-sm" 
                value={newAct.duration_minutes} onChange={e => setNewAct({...newAct, duration_minutes: parseInt(e.target.value)})} min="15" step="15" title="Duração do turno/atividade em minutos"
              />
            </div>

            <div className="flex justify-end gap-2">
              <button type="button" className="text-xs text-muted hover:text-white px-3 py-1" onClick={() => setShowActForm(false)}>Cancelar</button>
              <button type="submit" className="bg-blue-500 text-white font-bold text-xs px-4 py-2 rounded-lg hover:brightness-110">Salvar</button>
            </div>
          </form>
        )}

        <div className="space-y-3">
          {activities.length === 0 ? <p className="text-muted text-sm text-center py-4">Nenhuma atividade cadastrada.</p> : activities.map(act => (
            <div key={act.id} className="p-4 bg-black/20 border border-white/5 rounded-xl hover:border-blue-500/30 transition-colors">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-bold text-sm">{act.name}</h3>
                <span className="text-[10px] uppercase font-bold text-blue-400 bg-blue-400/10 px-2 py-0.5 rounded-full">{act.duration_minutes} MIN</span>
              </div>
              <div className="text-xs text-muted flex gap-3">
                <span>📍 {act.work_environments?.name || '---'}</span>
                <span>👨‍💼 Requisito: {act.required_role}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
