import React, { useState, useEffect } from 'react';
import { Calendar, Users, MapPin, BarChart3, Search, Plus, Bell, User } from 'lucide-react';
import ShiftsDashboard from './ShiftsDashboard';
import EnvironmentsManager from './EnvironmentsManager';
import EmployeesManager from './EmployeesManager';
import ShiftPlanner from './ShiftPlanner';
import MyShifts from './MyShifts';
import './ShiftsRedesign.css';

export default function ShiftsModule({ companyId, currentUser, userRole }) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  
  if (!companyId) return null;

  if (userRole !== 'admin') {
    return <MyShifts companyId={companyId} currentUser={currentUser} />;
  }

  return (
    <div className="shifts-module-wrapper g4-mirror animate-fade-in">
      {/* G4 STYLE TOP HEADER */}
      <header className="g4-top-header">
        <div className="flex items-center gap-6">
          <div className="g4-logo-container">
            <h2 className="text-xl font-bold text-gray-800">Escalas</h2>
          </div>
          <div className="g4-search-box">
             <Search size={18} className="text-gray-400" />
             <input 
                type="text" 
                placeholder="Buscar funcionário, contratos..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
             />
          </div>
        </div>
        
        <div className="flex items-center gap-4">
            <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <Plus size={20} className="text-gray-600" />
            </button>
            <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden border-2 border-white shadow-sm">
                {currentUser?.photoURL ? (
                    <img src={currentUser.photoURL} alt="User" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-accent-gold text-white font-bold">
                        {currentUser?.displayName?.[0] || 'U'}
                    </div>
                )}
            </div>
        </div>
      </header>

      <div className="g4-tabs-container">
        <div className="g4-tabs-list">
            <button 
            className={`g4-tab ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
            >
            <BarChart3 size={18} /> Resumo Operacional
            </button>
            <button 
            className={`g4-tab ${activeTab === 'planner' ? 'active' : ''}`}
            onClick={() => setActiveTab('planner')}
            >
            <Calendar size={18} /> Planejador de Escalas
            </button>
            <button 
            className={`g4-tab ${activeTab === 'employees' ? 'active' : ''}`}
            onClick={() => setActiveTab('employees')}
            >
            <Users size={18} /> Disponibilidade da Equipe
            </button>
            <button 
            className={`g4-tab ${activeTab === 'environments' ? 'active' : ''}`}
            onClick={() => setActiveTab('environments')}
            >
            <MapPin size={18} /> Ambientes e Regras
            </button>
        </div>
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
