import React, { useState, useEffect } from 'react';
import { Sparkles, Brain, ChevronRight, UserPlus, Info, Loader2 } from 'lucide-react';
import { suggestShiftAssignments, generateShiftInsights } from '../../services/geminiService';

export default function IntelligencePanel({ shifts, employees, companyName, onAssign }) {
  const [insights, setInsights] = useState('');
  const [suggestions, setSuggestions] = useState({});
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState({});

  useEffect(() => {
    if (shifts.length > 0) {
      handleGetInsights();
    }
  }, [shifts.length]);

  const handleGetInsights = async () => {
    setLoadingInsights(true);
    try {
      const res = await generateShiftInsights(shifts, employees, companyName);
      setInsights(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingInsights(false);
    }
  };

  const handleGetSuggestions = async (shift) => {
    setLoadingSuggestions(prev => ({ ...prev, [shift.id]: true }));
    try {
      const available = employees.filter(e => 
        !shift.assigned_employees.some(ae => ae.profile_id === e.profile_id)
      );
      const res = await suggestShiftAssignments(shift, available, companyName);
      if (res && res.suggestions) {
        setSuggestions(prev => ({ ...prev, [shift.id]: res.suggestions }));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingSuggestions(prev => ({ ...prev, [shift.id]: false }));
    }
  };

  return (
    <div className="intelligence-panel glass-morphism animate-fade-in">
      <div className="intelligence-header">
        <Sparkles className="text-accent" size={20} />
        <h3>Insights da IA (Gestão)</h3>
      </div>

      <div className="insight-summary">
        {loadingInsights ? (
          <div className="flex items-center gap-2 text-sm opacity-70">
            <Loader2 className="animate-spin" size={14} /> Analisando cobertura...
          </div>
        ) : (
          <p className="text-sm leading-relaxed">{insights || "Aguardando dados para análise..."}</p>
        )}
      </div>

      <div className="intelligence-suggestions mt-6">
        <h4 className="text-xs font-bold uppercase tracking-wider opacity-60 mb-3 flex items-center gap-2">
          <Brain size={14} /> Sugestões de Alocação
        </h4>
        
        <div className="suggestions-list space-y-3">
          {shifts.filter(s => s.assigned_count === 0).slice(0, 3).map(shift => (
            <div key={shift.id} className="suggestion-card">
              <div className="suggestion-info">
                <span className="text-xs font-medium block">{shift.activity_name}</span>
                <span className="text-[10px] opacity-60">{shift.environment_name}</span>
              </div>

              {suggestions[shift.id] ? (
                <div className="suggestions-results animate-slide-up">
                  {suggestions[shift.id].map(sug => (
                    <div key={sug.employeeId} className="sug-item" onClick={() => onAssign(shift.id, sug.employeeId)}>
                      <div className="sug-match">
                        <span className="sug-name">{sug.name}</span>
                        <span className="sug-score">{sug.matchScore}% match</span>
                      </div>
                      <p className="sug-reason">{sug.reason}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <button 
                  className="btn-ask-brain" 
                  disabled={loadingSuggestions[shift.id]}
                  onClick={() => handleGetSuggestions(shift)}
                >
                  {loadingSuggestions[shift.id] ? <Loader2 className="animate-spin" size={12} /> : "Pedir Sugestão"}
                </button>
              )}
            </div>
          ))}
          
          {shifts.filter(s => s.assigned_count === 0).length === 0 && (
            <div className="empty-suggestions">
              <Info size={14} />
              <span>Tudo alocado! Parabéns.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
