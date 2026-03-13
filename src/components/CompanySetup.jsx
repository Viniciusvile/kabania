import React, { useState } from 'react';
import { Building2, Key, ChevronRight, ChevronLeft, Check, Sparkles } from 'lucide-react';
import './CompanySetup.css';

export const SECTOR_TEMPLATES = {
  condominios: {
    label: 'Gestão de Condomínios',
    emoji: '🏢',
    description: 'Administração de condomínios residenciais e comerciais',
    tags: ['Taxa condominial', 'Assembleia', 'Manutenção', 'Inadimplência', 'Síndico', 'Regimento interno', 'Obras', 'Dedetização', 'ABNT', 'Segurança predial']
  },
  acesso: {
    label: 'Controle de Acesso',
    emoji: '🔒',
    description: 'Sistemas de segurança e controle de entrada em prédios',
    tags: ['Controle de acesso', 'Visitantes', 'Biometria', 'Câmeras', 'Portaria remota', 'LGPD', 'Interfone', 'Cancela', 'Credencial', 'Monitoramento']
  },
  saude: {
    label: 'Saúde',
    emoji: '🏥',
    description: 'Clínicas, hospitais e serviços de saúde',
    tags: ['Agendamento', 'Prontuario', 'ANVISA', 'Convenios', 'Medicamentos', 'Paciente', 'Diagnostico', 'Procedimento', 'CRM', 'Vigilancia sanitaria']
  },
  tech: {
    label: 'Tecnologia',
    emoji: '🔧',
    description: 'Empresas de software e desenvolvimento',
    tags: ['Bug', 'Deploy', 'API', 'Sprint', 'Backlog', 'DevOps', 'Frontend', 'Backend', 'Database', 'CI/CD']
  },
  logistica: {
    label: 'Logística',
    emoji: '📦',
    description: 'Transporte, estoque e distribuição',
    tags: ['Entrega', 'Estoque', 'Fornecedor', 'Frete', 'NF-e', 'Rastreamento', 'Armazem', 'Transporte', 'SKU', 'Inventario']
  },
  generic: {
    label: 'Genérico',
    emoji: '⚙️',
    description: 'Personalização completa sem tags pré-definidas',
    tags: []
  }
};

export default function CompanySetup({ currentUser, onComplete }) {
  const [step, setStep] = useState(1);
  const [mode, setMode] = useState(null); // 'create' or 'join'
  const [companyName, setCompanyName] = useState('');
  const [selectedSector, setSelectedSector] = useState(null);
  const [joinCode, setJoinCode] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const getCompaniesDB = () => JSON.parse(localStorage.getItem('synapseCompanies') || '[]');
  const saveCompaniesDB = (c) => localStorage.setItem('synapseCompanies', JSON.stringify(c));
  const getUsersDB = () => JSON.parse(localStorage.getItem('synapseUsers') || '[]');
  const saveUsersDB = (u) => localStorage.setItem('synapseUsers', JSON.stringify(u));
  const generateCode = (id) => id.slice(-6).toUpperCase();

  const handleCreate = () => {
    setIsLoading(true);
    setError('');
    setTimeout(() => {
      const companies = getCompaniesDB();
      const newCompany = {
        id: `co-${Date.now()}`,
        name: companyName.trim(),
        sector: selectedSector,
        createdAt: new Date().toISOString()
      };
      newCompany.code = generateCode(newCompany.id);
      companies.push(newCompany);
      saveCompaniesDB(companies);

      // Update user with companyId + admin role
      const users = getUsersDB();
      const updatedUsers = users.map(u =>
        u.email === currentUser ? { ...u, companyId: newCompany.id, role: 'admin' } : u
      );
      saveUsersDB(updatedUsers);

      // Pre-load sector template tags into company knowledge base
      const template = SECTOR_TEMPLATES[selectedSector];
      if (template && template.tags.length > 0) {
        const knowledgeItems = template.tags.map((tag, i) => ({
          id: `kb-${Date.now()}-${i}`,
          title: tag,
          description: `Tag de autorização pré-configurada para o setor: ${template.label}`,
          enabled: true,
          type: 'document',
          tags: [tag]
        }));
        localStorage.setItem(`synapseKnowledgeState_COMPANY_${newCompany.id}`, JSON.stringify(knowledgeItems));
      }

      localStorage.setItem('synapseCurrentCompany', JSON.stringify({ ...newCompany, role: 'admin' }));
      localStorage.setItem('synapseUserRole', 'admin');
      onComplete({ company: newCompany, role: 'admin' });
      setIsLoading(false);
    }, 900);
  };

  const handleJoin = () => {
    if (!joinCode.trim()) { setError('Digite o código da empresa.'); return; }
    setIsLoading(true);
    setError('');
    setTimeout(() => {
      const companies = getCompaniesDB();
      const company = companies.find(c => c.code === joinCode.trim().toUpperCase());
      if (!company) {
        setError('Código inválido. Verifique e tente novamente.');
        setIsLoading(false);
        return;
      }

      const users = getUsersDB();
      const updatedUsers = users.map(u =>
        u.email === currentUser ? { ...u, companyId: company.id, role: 'member' } : u
      );
      saveUsersDB(updatedUsers);

      localStorage.setItem('synapseCurrentCompany', JSON.stringify({ ...company, role: 'member' }));
      localStorage.setItem('synapseUserRole', 'member');
      onComplete({ company, role: 'member' });
      setIsLoading(false);
    }, 800);
  };

  return (
    <div className="company-setup-overlay">
      <div className="company-setup-card">
        <div className="company-setup-header">
          <Building2 size={36} className="cs-logo" />
          <h1>Configurar sua Empresa</h1>
          <p>Personalize a IA para o contexto do seu negócio</p>
          <div className="cs-progress">
            {[1, 2, 3].map(s => (
              <React.Fragment key={s}>
                <div className={`cs-dot ${step >= s ? 'active' : ''} ${step > s ? 'done' : ''}`}>
                  {step > s ? <Check size={11} /> : s}
                </div>
                {s < 3 && <div className={`cs-line ${step > s ? 'done' : ''}`} />}
              </React.Fragment>
            ))}
          </div>
        </div>

        <div className="company-setup-body">
          {error && <div className="cs-error">{error}</div>}

          {/* STEP 1: Choose mode */}
          {step === 1 && (
            <div className="cs-step-content">
              <h2>Como deseja configurar sua empresa?</h2>
              <div className="cs-mode-grid">
                <button className={`cs-mode-card ${mode === 'create' ? 'selected' : ''}`} onClick={() => { setMode('create'); setError(''); }}>
                  <Building2 size={30} />
                  <strong>Criar nova empresa</strong>
                  <span>Configure a sua organização e convide sua equipe</span>
                </button>
                <button className={`cs-mode-card ${mode === 'join' ? 'selected' : ''}`} onClick={() => { setMode('join'); setError(''); }}>
                  <Key size={30} />
                  <strong>Entrar em empresa existente</strong>
                  <span>Use o código compartilhado pelo administrador</span>
                </button>
              </div>
              <button className="cs-btn-primary" disabled={!mode} onClick={() => setStep(2)}>
                Continuar <ChevronRight size={16} />
              </button>
            </div>
          )}

          {/* STEP 2A: Create company */}
          {step === 2 && mode === 'create' && (
            <div className="cs-step-content">
              <h2>Informações da empresa</h2>
              <div className="cs-form-group">
                <label>Nome da empresa</label>
                <input
                  type="text"
                  placeholder="Ex: Condomínios ABC Administradora"
                  value={companyName}
                  onChange={e => setCompanyName(e.target.value)}
                  className="cs-input"
                />
              </div>
              <div className="cs-form-group">
                <label>Setor de atuação <span className="cs-label-hint">— carrega tags da IA pré-configuradas</span></label>
                <div className="cs-sectors-grid">
                  {Object.entries(SECTOR_TEMPLATES).map(([key, sector]) => (
                    <button
                      key={key}
                      className={`cs-sector-card ${selectedSector === key ? 'selected' : ''}`}
                      onClick={() => setSelectedSector(key)}
                    >
                      <span className="cs-sector-emoji">{sector.emoji}</span>
                      <strong>{sector.label}</strong>
                      <span className="cs-sector-desc">{sector.description}</span>
                      {selectedSector === key && sector.tags.length > 0 && (
                        <div className="cs-sector-preview">
                          <Sparkles size={10} /> {sector.tags.slice(0, 3).join(', ')}...
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
              <div className="cs-btn-row">
                <button className="cs-btn-secondary" onClick={() => setStep(1)}>
                  <ChevronLeft size={16} /> Voltar
                </button>
                <button
                  className="cs-btn-primary"
                  disabled={!companyName.trim() || !selectedSector}
                  onClick={() => { setError(''); setStep(3); }}
                >
                  Revisar e confirmar <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2B: Join company */}
          {step === 2 && mode === 'join' && (
            <div className="cs-step-content">
              <h2>Entrar em empresa existente</h2>
              <div className="cs-form-group">
                <label>Código da empresa</label>
                <input
                  type="text"
                  placeholder="Ex: AB12CD"
                  value={joinCode}
                  onChange={e => setJoinCode(e.target.value)}
                  className="cs-input cs-input-code"
                  maxLength={6}
                />
                <p className="cs-hint-text">Solicite o código de 6 caracteres ao administrador da sua empresa. Você ingressará como membro.</p>
              </div>
              <div className="cs-btn-row">
                <button className="cs-btn-secondary" onClick={() => setStep(1)}>
                  <ChevronLeft size={16} /> Voltar
                </button>
                <button className="cs-btn-primary" onClick={handleJoin} disabled={!joinCode.trim() || isLoading}>
                  {isLoading ? 'Verificando...' : <>Entrar na empresa <ChevronRight size={16} /></>}
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Confirm */}
          {step === 3 && (
            <div className="cs-step-content cs-confirm">
              <div className="cs-confirm-icon">
                {selectedSector ? SECTOR_TEMPLATES[selectedSector]?.emoji : '🏢'}
              </div>
              <h2>Tudo certo! Confirme os dados</h2>
              <div className="cs-summary">
                <div className="cs-summary-row">
                  <span>Empresa</span>
                  <strong>{companyName}</strong>
                </div>
                <div className="cs-summary-row">
                  <span>Setor</span>
                  <strong>{selectedSector && SECTOR_TEMPLATES[selectedSector]?.label}</strong>
                </div>
                {selectedSector && SECTOR_TEMPLATES[selectedSector]?.tags.length > 0 && (
                  <div className="cs-summary-row">
                    <span>Tags de IA carregadas</span>
                    <strong>{SECTOR_TEMPLATES[selectedSector].tags.length} tags</strong>
                  </div>
                )}
                <div className="cs-summary-row">
                  <span>Seu papel</span>
                  <strong className="cs-role-gold">👑 Administrador</strong>
                </div>
              </div>
              <div className="cs-btn-row">
                <button className="cs-btn-secondary" onClick={() => setStep(2)}>
                  <ChevronLeft size={16} /> Editar
                </button>
                <button className="cs-btn-primary cs-btn-confirm" onClick={handleCreate} disabled={isLoading}>
                  {isLoading ? 'Configurando...' : <><Check size={16} /> Criar empresa e entrar</>}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
