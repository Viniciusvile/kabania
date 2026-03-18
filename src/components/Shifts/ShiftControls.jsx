import React from 'react';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';

export default function ShiftControls({ 
  filterStatus, 
  setFilterStatus, 
  weekStart, 
  setWeekStart, 
  weekDays, 
  setIsModalOpen 
}) {
  return (
    <div className="controls-bar-pixel">
      <div className="flex items-center gap-4">
        <div className="filter-pills-pixel">
          <button className={filterStatus === 'todos' ? 'active' : ''} onClick={() => setFilterStatus('todos')}>Todos</button>
          <button className={filterStatus === 'ativos' ? 'active' : ''} onClick={() => setFilterStatus('ativos')}>Ativos</button>
          <button className={filterStatus === 'concluidos' ? 'active' : ''} onClick={() => setFilterStatus('concluidos')}>Concluídos</button>
        </div>
        
        <div className="period-selector-pixel">
          <button onClick={() => setWeekStart(new Date(weekStart.setDate(weekStart.getDate() - 7)))}><ChevronLeft size={16} /></button>
          <span className="font-bold text-sm">
            {weekDays[0].date.toLocaleDateString('pt-BR', {day:'numeric', month:'short'})} a {weekDays[6].date.toLocaleDateString('pt-BR', {day:'numeric', month:'short'})} {weekDays[6].date.getFullYear()}
          </span>
          <button onClick={() => setWeekStart(new Date(weekStart.setDate(weekStart.getDate() + 7)))}><ChevronRight size={16} /></button>
        </div>
      </div>

      <button className="new-escala-btn" onClick={() => setIsModalOpen(true)}>
        <Plus size={18} /> Nova Escala
      </button>
    </div>
  );
}
