import React from 'react';
import { ArrowRight, Sparkles } from 'lucide-react';
import './components.css';

export default function Hero() {
  return (
    <section className="hero">
      <div className="glow glow-hero"></div>
      <div className="container hero-content">
        <div className="badge fade-in">
          <Sparkles size={16} className="text-secondary" />
          <span>A Evolução do Gerenciamento de Tarefas</span>
        </div>
        <h1 className="hero-title fade-in delay-1">
          Kanban Cognitivo de <br/><span className="text-gradient">Ciclo Fechado</span>
        </h1>
        <p className="hero-subtitle fade-in delay-2">
          Uma plataforma que transforma o histórico de falhas e sucessos da sua empresa em uma <strong>inteligência coletiva acionável</strong>. Desbloqueie tarefas e acelere sua tomada de decisão em tempo real.
        </p>
        <div className="hero-actions fade-in delay-3">
          <button className="btn btn-primary btn-large">
            Ver Demonstração <ArrowRight size={20} />
          </button>
          <button className="btn btn-secondary btn-large">
            Falar com Consultor
          </button>
        </div>
      </div>
    </section>
  );
}
