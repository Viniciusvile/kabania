import React from 'react';
import { Calendar, Clock, Briefcase, CheckCircle } from 'lucide-react';

export default function ShiftStats({ stats }) {
  const cards = [
    { label: 'Total de Escalas', value: stats.total, icon: Calendar, color: 'blue' },
    { label: 'Escalas Abertas', value: stats.open, icon: Clock, color: 'red' },
    { label: 'Escalas em Curso', value: stats.inProgress, icon: Briefcase, color: 'green' },
    { label: 'Escalas Concluídas', value: stats.concluded, icon: CheckCircle, color: 'purple' },
  ];

  return (
    <div className="stats-grid-pixel">
      {cards.map((card, i) => (
        <div key={i} className="stat-card-pixel">
          <div className={`stat-icon-wrapper ${card.color}`}>
            <card.icon size={20} />
          </div>
          <div className="stat-content">
            <span className="stat-label">{card.label}</span>
            <span className="stat-value">{card.value}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
