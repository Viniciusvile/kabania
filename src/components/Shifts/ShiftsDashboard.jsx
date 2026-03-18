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
    if (!companyId) {
      console.warn('Dashboard: Missing companyId');
      return;
    }
    
    try {
      console.log('Dashboard: Loading stats for', companyId);
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const end = new Date();
      end.setHours(23, 59, 59, 999);

      const [shifts, employees, envs] = await Promise.all([
        getShifts(companyId, start.toISOString(), end.toISOString()),
        getEmployeeProfiles(companyId),
        getWorkEnvironments(companyId)
      ]);

      console.log('Dashboard Data Loaded:', { shifts: shifts.length, employees: employees.length, envs: envs.length });

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
        console.error('Dashboard Load Error:', e);
    }
  };

  return (
    <div className="stats-container-pixel animate-fade-in">
        <div className="stat-item-pixel">
            <div className="stat-icon-pixel">
                <Calendar size={24} />
            </div>
            <div className="stat-info-pixel">
                <p>Total Escalas</p>
                <p>{stats.totalShifts}</p>
            </div>
        </div>

        <div className="stat-item-pixel">
            <div className="stat-icon-pixel">
                <Clock size={24} />
            </div>
            <div className="stat-info-pixel">
                <p>Escalas Abertas</p>
                <p>{stats.openShifts}</p>
            </div>
        </div>

        <div className="stat-item-pixel">
            <div className="stat-icon-pixel">
                <Briefcase size={24} />
            </div>
            <div className="stat-info-pixel">
                <p>Escalas Em Curso</p>
                <p>{stats.inProgressShifts}</p>
            </div>
        </div>

        <div className="stat-item-pixel">
            <div className="stat-icon-pixel">
                <CheckCircle size={24} />
            </div>
            <div className="stat-info-pixel">
                <p>Escalas Concluídas</p>
                <p>{stats.concludedShifts}</p>
            </div>
        </div>
    </div>
  );
}
