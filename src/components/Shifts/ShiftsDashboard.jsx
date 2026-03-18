import React, { useState, useEffect } from 'react';
import { BarChart3, Users, AlertTriangle, Clock, MapPin } from 'lucide-react';
import { getShifts, getEmployeeProfiles, getEnvironments } from '../../../services/shiftService';

export default function ShiftsDashboard({ companyId }) {
  const [stats, setStats] = useState({
      totalEmployees: 0,
      totalEnvironments: 0,
      todayShifts: 0,
      hoursToday: 0,
      criticalEnvironments: 0
  });

  useEffect(() => {
     loadStats();
  }, [companyId]);

  const loadStats = async () => {
      try {
        const start = new Date();
        start.setHours(0, 0, 0, 0);
        const end = new Date();
        end.setHours(23, 59, 59, 999);

        const [shifts, employees, envs] = await Promise.all([
          getShifts(companyId, start.toISOString(), end.toISOString()),
          getEmployeeProfiles(companyId),
          getEnvironments(companyId)
        ]);

        let hours = 0;
        shifts.forEach(s => {
            const h = (new Date(s.end_time) - new Date(s.start_time)) / (1000 * 60 * 60);
            hours += h;
        });

        let critical = 0;
        envs.forEach(env => {
            const covered = shifts.filter(s => s.environment_id === env.id).length;
            if (covered < env.min_coverage) critical++;
        });

        setStats({
            totalEmployees: employees.length,
            totalEnvironments: envs.length,
            todayShifts: shifts.length,
            hoursToday: hours.toFixed(1),
            criticalEnvironments: critical
        });
      } catch(e) {
          console.error(e);
      }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-fade-in">
        <div className="shift-card bg-gradient-to-br from-[#0d1117] to-[#161b22] border-blue-500/20">
            <div className="flex items-center gap-4">
                <div className="p-4 rounded-xl bg-blue-500/10 text-blue-400">
                    <Users size={24} />
                </div>
                <div>
                    <h3 className="text-muted text-sm font-bold uppercase tracking-wider">Equipe Total</h3>
                    <div className="text-3xl font-bold mt-1">{stats.totalEmployees}</div>
                </div>
            </div>
        </div>

        <div className="shift-card bg-gradient-to-br from-[#0d1117] to-[#161b22] border-accent/20">
            <div className="flex items-center gap-4">
                <div className="p-4 rounded-xl bg-accent/10 text-accent">
                    <Clock size={24} />
                </div>
                <div>
                    <h3 className="text-muted text-sm font-bold uppercase tracking-wider">Horas Hoje</h3>
                    <div className="text-3xl font-bold mt-1">{stats.hoursToday}h</div>
                </div>
            </div>
        </div>

        <div className="shift-card bg-gradient-to-br from-[#0d1117] to-[#161b22] border-emerald-500/20">
            <div className="flex items-center gap-4">
                <div className="p-4 rounded-xl bg-emerald-500/10 text-emerald-400">
                    <MapPin size={24} />
                </div>
                <div>
                    <h3 className="text-muted text-sm font-bold uppercase tracking-wider">Ambientes</h3>
                    <div className="text-3xl font-bold mt-1">{stats.totalEnvironments}</div>
                </div>
            </div>
        </div>

        <div className="shift-card bg-gradient-to-br from-[#0d1117] to-red-900/10 border-red-500/30">
            <div className="flex items-center gap-4">
                <div className="p-4 rounded-xl bg-red-500/10 text-red-500">
                    <AlertTriangle size={24} />
                </div>
                <div>
                    <h3 className="text-muted text-sm font-bold w-full truncate">Abaixo da Cobertura</h3>
                    <div className="text-3xl font-bold mt-1 text-red-400">{stats.criticalEnvironments} <span className="text-base text-red-500/50">ambientes hoje</span></div>
                </div>
            </div>
        </div>

        <div className="shift-card lg:col-span-2 xl:col-span-3 min-h-[400px] flex items-center justify-center border-dashed border-white/5">
            <div className="text-center opacity-50">
                <BarChart3 size={48} className="mx-auto mb-4" />
                <p>Gráficos de alocação mensal em desenvolvimento...</p>
            </div>
        </div>
    </div>
  );
}
