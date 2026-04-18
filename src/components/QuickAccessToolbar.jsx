import React, { useEffect, useRef, useState } from 'react';
import {
  FolderKanban, ClipboardList, LifeBuoy, Search,
  Focus, X, Zap
} from 'lucide-react';
import './QuickAccessToolbar.css';

const FOCUS_KEY = 'kabania_focus_mode';

export default function QuickAccessToolbar({ onViewChange, onClose }) {
  const [focusMode, setFocusMode] = useState(() => localStorage.getItem(FOCUS_KEY) === 'true');
  const panelRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    function handler(e) {
      if (panelRef.current && !panelRef.current.contains(e.target)) onClose();
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  // Close on Escape
  useEffect(() => {
    function handler(e) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleFocusMode = () => {
    const next = !focusMode;
    setFocusMode(next);
    localStorage.setItem(FOCUS_KEY, next);
    document.body.classList.toggle('focus-mode', next);
    onClose();
  };

  const go = (view) => { onViewChange(view); onClose(); };

  const shortcuts = [
    {
      icon: <FolderKanban size={22} />,
      label: 'Projetos',
      desc: 'Abrir área de projetos',
      color: '#00e5ff',
      onClick: () => go('projects'),
    },
    {
      icon: <ClipboardList size={22} />,
      label: 'Folha de Ponto',
      desc: 'Ver relatório de horas',
      color: '#a78bfa',
      onClick: () => go('shifts'),
    },
    {
      icon: <LifeBuoy size={22} />,
      label: 'Nova Solicitação',
      desc: 'Abrir central de serviços',
      color: '#34d399',
      onClick: () => go('service_center'),
    },
    {
      icon: <Search size={22} />,
      label: 'Busca Global',
      desc: 'Pesquisar em todo o sistema',
      color: '#fbbf24',
      onClick: () => go('kanban'),
    },
    {
      icon: <Focus size={22} />,
      label: focusMode ? 'Sair do Foco' : 'Modo Foco',
      desc: focusMode ? 'Restaurar interface' : 'Ocultar painel lateral',
      color: focusMode ? '#f87171' : '#fb923c',
      onClick: handleFocusMode,
      active: focusMode,
    },
  ];

  return (
    <div className="qat-backdrop" onClick={onClose}>
      <div className="qat-panel" ref={panelRef} onClick={e => e.stopPropagation()}>
        <div className="qat-header">
          <div className="qat-header-left">
            <Zap size={16} className="qat-header-icon" />
            <span>Acesso Rápido</span>
          </div>
          <button className="qat-close" onClick={onClose}><X size={16} /></button>
        </div>

        <div className="qat-grid">
          {shortcuts.map((s) => (
            <button
              key={s.label}
              className={`qat-btn ${s.active ? 'qat-btn-active' : ''}`}
              onClick={s.onClick}
              title={s.desc}
            >
              <span className="qat-btn-icon" style={{ color: s.color, background: `${s.color}18` }}>
                {s.icon}
              </span>
              <span className="qat-btn-label">{s.label}</span>
              <span className="qat-btn-desc">{s.desc}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
