import React from 'react';
import { Activity, Database, BookOpen } from 'lucide-react';
import './components.css';

export default function Features() {
  const features = [
    {
      icon: <Activity size={28} className="text-secondary" />,
      title: "Diagnóstico de Gargalos",
      description: "A IA rastreia cartões estagnados, identifica padrões de atraso e alerta o gestor antes que o cronograma do projeto seja comprometido."
    },
    {
      icon: <Database size={28} className="text-primary" />,
      title: "Consultoria com Dados Próprios",
      description: "Respostas baseadas no SEU histórico. A IA analisa projetos passados: 'Para este problema, a solução usada no Projeto X (2024) foi Y'."
    },
    {
      icon: <BookOpen size={28} className="text-accent" />,
      title: "Treinamento Contínuo",
      description: "Transforme a experiência dos seus melhores talentos em ativo digital. Cada problema resolvido ensina a IA a lidar com desafios futuros."
    }
  ];

  return (
    <section id="features" className="features container">
      <div className="section-header fade-in">
        <h2 className="section-title">Os Três Pilares da Solução</h2>
        <p className="section-subtitle">
          Muito mais que um quadro visual. O Synapse Smart funciona como um consultor estratégico e a memória técnica definitiva da sua empresa.
        </p>
      </div>
      
      <div className="features-grid">
        {features.map((feature, index) => (
          <div key={index} className={`feature-card fade-in delay-${index + 1}`}>
            <div className="feature-icon-wrapper">
              {feature.icon}
            </div>
            <h3>{feature.title}</h3>
            <p>{feature.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
