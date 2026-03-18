import React, { useState, useEffect } from 'react';
import { Calendar, Users, MapPin, BarChart3, Loader2 } from 'lucide-react';
import './ShiftsModule.css';

// Placeholder components - will be implemented individually
import ShiftsDashboard from './ShiftsDashboard';
import EnvironmentsManager from './EnvironmentsManager';
import EmployeesManager from './EmployeesManager';
import ShiftPlanner from './ShiftPlanner';
import MyShifts from './MyShifts';
import './ShiftsRedesign.css';

export default function ShiftsModule({ companyId, currentUser, userRole }) {
  const [activeTab, setActiveTab] = useState('dashboard');
  
  if (!companyId) return null;

  // Regular users see their own shifts only
  if (userRole !== 'admin') {
    return <MyShifts companyId={companyId} currentUser={currentUser} />;
  }

  return (
    <div className="shifts-module-wrapper premium-light animate-fade-in">
      <header className="shifts-header">
        <div>
          <h1 className="text-2xl font-bold">Gestão Inteligente de Escalas</h1>
          <p className="text-muted mt-1">Organize turnos, ambientes e funcionários com alocação automática.</p>
        </div>
      </header>

      <div className="shifts-tabs">
        <button 
          className={`shifts-tab ${activeTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => setActiveTab('dashboard')}
        >
          <BarChart3 size={18} /> Resumo Operacional
        </button>
        <button 
          className={`shifts-tab ${activeTab === 'planner' ? 'active' : ''}`}
          onClick={() => setActiveTab('planner')}
        >
          <Calendar size={18} /> Planejador de Escalas
        </button>
        <button 
          className={`shifts-tab ${activeTab === 'employees' ? 'active' : ''}`}
          onClick={() => setActiveTab('employees')}
        >
          <Users size={18} /> Disponibilidade da Equipe
        </button>
        <button 
          className={`shifts-tab ${activeTab === 'environments' ? 'active' : ''}`}
          onClick={() => setActiveTab('environments')}
        >
          <MapPin size={18} /> Ambientes e Regras
        </button>
      </div>

      <div className="shifts-content-area">
        {activeTab === 'dashboard' && <ShiftsDashboard companyId={companyId} />}
        {activeTab === 'planner' && <ShiftPlanner companyId={companyId} currentUser={currentUser} />}
        {activeTab === 'employees' && <EmployeesManager companyId={companyId} />}
        {activeTab === 'environments' && <EnvironmentsManager companyId={companyId} />}
      </div>
    </div>
  );
}
