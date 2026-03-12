import React from 'react';
import { BrainCircuit } from 'lucide-react';
import './components.css';

export default function Navbar() {
  return (
    <nav className="navbar glass-panel">
      <div className="container nav-content">
        <div className="logo">
          <BrainCircuit className="logo-icon text-accent" size={28} />
          <span className="logo-text">Kabania<span className="text-gradient">.ai</span></span>
        </div>
        <div className="nav-links">
          <a href="#features">Pilares</a>
          <a href="#demo">Como Funciona</a>
          <button className="btn btn-primary pulse-button">Solicitar Acesso</button>
        </div>
      </div>
    </nav>
  );
}
