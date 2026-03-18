import React, { useState, useEffect } from 'react';
import { BarChart3, Users, Clock, Calendar, CheckCircle, Plus } from 'lucide-react';
import { getShifts, getEmployeeProfiles, getWorkEnvironments } from '../../services/shiftService';
import './ShiftsRedesign.css';

export default function ShiftsDashboard({ companyId }) {
  const [stats, setStats] = useState({
      totalShifts: 0,
      openShifts: 0,
      inProgressShifts: 0,
      concludedShifts: '0/0'
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
          getWorkEnvironments(companyId)
        ]);

        const inProgress = shifts.filter(s => {
            const now = new Date();
            return now >= new Date(s.start_time) && now <= new Date(s.end_time);
        }).length;

        const open = envs.reduce((acc, env) => {
            const covered = shifts.filter(s => s.environment_id === env.id).length;
            return acc + Math.max(0, env.min_coverage - covered);
        }, 0);

        setStats({
            totalShifts: shifts.length,
            openShifts: open,
            inProgressShifts: inProgress,
            concludedShifts: `${shifts.filter(s => new Date(s.end_time) < new Date()).length}/${shifts.length}`
        });
      } catch(e) {
          console.error(e);
      }
  };

  return (
    <div className="stats-grid-new animate-fade-in">
        <div className="stat-card-white">
            <div className="stat-icon-wrapper bg-blue-50 text-blue-500">
                <Calendar size={24} />
            </div>
            <div>
                <p className="stat-label">Total Escalas</p>
                <p className="stat-value">{stats.totalShifts}</p>
            </div>
        </div>

        <div className="stat-card-white">
            <div className="stat-icon-wrapper bg-amber-50 text-amber-500">
                <Clock size={24} />
            </div>
            <div>
                <p className="stat-label">Escalas Abertas</p>
                <p className="stat-value text-amber-600">{stats.openShifts}</p>
            </div>
        </div>

        <div className="stat-card-white">
            <div className="stat-icon-wrapper bg-indigo-50 text-indigo-500">
                <CheckCircle size={24} />
            </div>
            <div>
                <p className="stat-label">Escalas Em Curso</p>
                <p className="stat-value">{stats.inProgressShifts}</p>
            </div>
        </div>

        <div className="stat-card-white">
            <div className="stat-icon-wrapper bg-emerald-50 text-emerald-500">
                <BarChart3 size={24} />
            </div>
            <div>
                <p className="stat-label">Escalas Concluídas</p>
                <p className="stat-value text-emerald-600">{stats.concludedShifts}</p>
            </div>
        </div>
    </div>
  );
}
