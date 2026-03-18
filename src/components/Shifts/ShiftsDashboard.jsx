import React, { useState, useEffect } from 'react';
import { Calendar, Clock, CheckCircle, BarChart3, Briefcase } from 'lucide-react';
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
    <div className="stats-container-pixel animate-fade-in">
        <div className="stat-item-pixel">
            <div className="stat-icon-pixel">
                <Calendar size={20} className="text-blue-500" />
            </div>
            <div className="stat-info-pixel">
                <p>Total Escalas</p>
                <p>{stats.totalShifts}</p>
            </div>
        </div>

        <div className="stat-item-pixel">
            <div className="stat-icon-pixel bg-amber-50">
                <Clock size={20} className="text-amber-500" />
            </div>
            <div className="stat-info-pixel">
                <p>Escalas Abertas</p>
                <p className="text-amber-600">{stats.openShifts}</p>
            </div>
        </div>

        <div className="stat-item-pixel">
            <div className="stat-icon-pixel bg-indigo-50">
                <Briefcase size={20} className="text-indigo-500" />
            </div>
            <div className="stat-info-pixel">
                <p>Escalas Em Curso</p>
                <p>{stats.inProgressShifts}</p>
            </div>
        </div>

        <div className="stat-item-pixel">
            <div className="stat-icon-pixel bg-emerald-50">
                <CheckCircle size={20} className="text-emerald-500" />
            </div>
            <div className="stat-info-pixel">
                <p>Escalas Concluídas</p>
                <p>{stats.concludedShifts}</p>
            </div>
        </div>
    </div>
  );
}
