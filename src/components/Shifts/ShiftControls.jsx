import React from 'react';
import { ChevronLeft, ChevronRight, Wand2, ClipboardList, ArrowLeftRight } from 'lucide-react';

export default function ShiftControls({
  filterStatus,
  setFilterStatus,
  weekStart,
  setWeekStart,
  weekDays,
  setIsModalOpen,
  onHoursReport,
  onSwapMarketplace,
  stats
}) {
  return (
    <div className="controls-bar-pixel" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
      <div className="flex items-center gap-4" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div className="filter-pills-pixel">
          <button className={filterStatus === 'todos' ? 'active' : ''} onClick={() => setFilterStatus('todos')}>Todos</button>
          <button className={filterStatus === 'ativos' ? 'active' : ''} onClick={() => setFilterStatus('ativos')}>Ativos</button>
          <button className={filterStatus === 'concluidos' ? 'active' : ''} onClick={() => setFilterStatus('concluidos')}>Concluídos</button>
        </div>
        
        <div className="period-selector-pixel">
          <button onClick={() => {
            const d = new Date(weekStart);
            d.setDate(d.getDate() - 7);
            setWeekStart(d);
          }}><ChevronLeft size={16} /></button>
          <span className="font-bold text-sm">
            {weekDays[0].date.toLocaleDateString('pt-BR', {day:'numeric', month:'short'})} a {weekDays[6].date.toLocaleDateString('pt-BR', {day:'numeric', month:'short'})} {weekDays[6].date.getFullYear()}
          </span>
          <button onClick={() => {
            const d = new Date(weekStart);
            d.setDate(d.getDate() + 7);
            setWeekStart(d);
          }}><ChevronRight size={16} /></button>
        </div>
      </div>

      {stats && (
        <div className="inline-stats-premium" style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '24px', 
          background: 'var(--bg-panel)',
          padding: '6px 24px',
          borderRadius: '100px',
          border: '1px solid var(--border-light)',
          margin: '0 auto' 
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', lineHeight: '1.2' }}>
            <span style={{ fontSize: '9px', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total</span>
            <span style={{ fontSize: '15px', color: '#3b82f6', fontWeight: 900 }}>{stats.total}</span>
          </div>
          <div style={{ width: '1px', height: '24px', background: 'var(--border-light)', opacity: 0.5 }}></div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', lineHeight: '1.2' }}>
            <span style={{ fontSize: '9px', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Abertas</span>
            <span style={{ fontSize: '15px', color: '#ef4444', fontWeight: 900 }}>{stats.open}</span>
          </div>
          <div style={{ width: '1px', height: '24px', background: 'var(--border-light)', opacity: 0.5 }}></div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', lineHeight: '1.2' }}>
            <span style={{ fontSize: '9px', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Em Curso</span>
            <span style={{ fontSize: '15px', color: '#10b981', fontWeight: 900 }}>{stats.inProgress}</span>
          </div>
          <div style={{ width: '1px', height: '24px', background: 'var(--border-light)', opacity: 0.5 }}></div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', lineHeight: '1.2' }}>
            <span style={{ fontSize: '9px', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Concluídas</span>
            <span style={{ fontSize: '15px', color: '#8b5cf6', fontWeight: 900 }}>{stats.concluded}</span>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: '8px' }}>
        <button className="glow-btn-ghost" style={{ display: 'flex', alignItems: 'center', gap: '8px' }} onClick={onHoursReport}>
          <ClipboardList size={16} />
          Folha de Ponto
        </button>
        <button className="glow-btn-ghost" style={{ display: 'flex', alignItems: 'center', gap: '8px' }} onClick={onSwapMarketplace}>
          <ArrowLeftRight size={16} />
          Trocas
        </button>
        <button className="glow-btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }} onClick={() => setIsModalOpen(true)}>
          <Wand2 size={16} />
          Agendar Nova Escala
        </button>
      </div>
    </div>
  );
}
