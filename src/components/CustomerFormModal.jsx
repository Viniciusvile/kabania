import React, { useState, useEffect } from 'react';
import { X, Save, Building2, MapPin, Mail, Phone, Users } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { logEvent } from '../services/historyService';

export default function CustomerFormModal({ isOpen, onClose, onSave, editingCustomer, currentCompanyId }) {
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    email: '',
    phone: '',
    employee_count: 0,
    estimated_revenue: 0,
    contract_id: null
  });
  const [contracts, setContracts] = useState([]);
  const [fetchingContracts, setFetchingContracts] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (editingCustomer) {
      setFormData({
        name: editingCustomer.name || '',
        address: editingCustomer.address || '',
        email: editingCustomer.email || '',
        phone: editingCustomer.phone || '',
        employee_count: editingCustomer.employee_count || 0,
        estimated_revenue: editingCustomer.estimated_revenue || 0,
        contract_id: editingCustomer.contract_id || null
      });
    } else {
      setFormData({
        name: '', address: '', email: '', phone: '', employee_count: 0, estimated_revenue: 0, contract_id: null
      });
    }
  }, [editingCustomer, isOpen]);

  useEffect(() => {
    const fetchContracts = async () => {
      if (!isOpen || !currentCompanyId) return;
      setFetchingContracts(true);
      try {
        const { data, error } = await supabase
          .from('contracts')
          .select('id, name, client')
          .eq('company_id', currentCompanyId);
        
        if (!error && data) {
          setContracts(data);
        }
      } catch (err) {
        console.error("Error fetching contracts:", err);
      } finally {
        setFetchingContracts(false);
      }
    };

    fetchContracts();
  }, [isOpen, currentCompanyId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name) return;
    
    setLoading(true);
    try {
      if (editingCustomer) {
        const { data, error } = await supabase
          .from('customers')
          .update(formData)
          .eq('id', editingCustomer.id)
          .select()
          .single();

        if (!error && data) {
          onSave(data);
          logEvent(currentCompanyId, 'system', 'CUSTOMER_UPDATED', `Dados do cliente ${data.name} atualizados.`);
        }
      } else {
        const { data, error } = await supabase
          .from('customers')
          .insert([{ ...formData, company_id: currentCompanyId }])
          .select()
          .single();

        if (!error && data) {
          onSave(data);
          logEvent(currentCompanyId, 'system', 'CUSTOMER_CREATED', `Novo cliente ${data.name} cadastrado.`);
        }
      }
    } catch (err) {
      console.error("Error saving customer:", err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="cfm-overlay" onClick={onClose}>
      <div className="cfm-modal animate-slide-up" onClick={e => e.stopPropagation()}>
        <div className="cfm-header">
          <h2>{editingCustomer ? 'Editar Cliente' : 'Novo Cliente'}</h2>
          <button className="cp-refresh-btn" onClick={onClose}><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="cfm-body">
            <div className="cfm-form">
              <div className="cfm-field full">
                <label>NOME DO CLIENTE / EMPRESA</label>
                <input 
                  required
                  placeholder="Ex: ACME Corp"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div className="cfm-field full">
                <label>ENDEREÇO</label>
                <input 
                  placeholder="Rua, Número, Bairro, Cidade"
                  value={formData.address}
                  onChange={e => setFormData({ ...formData, address: e.target.value })}
                />
              </div>

              <div className="cfm-field">
                <label>E-MAIL</label>
                <input 
                  type="email"
                  placeholder="exemplo@email.com"
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                />
              </div>

              <div className="cfm-field">
                <label>TELEFONE</label>
                <input 
                  placeholder="(00) 00000-0000"
                  value={formData.phone}
                  onChange={e => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>

              <div className="cfm-field">
                <label>Nº FUNCIONÁRIOS</label>
                <input 
                  type="number"
                  min="0"
                  value={formData.employee_count}
                  onChange={e => setFormData({ ...formData, employee_count: parseInt(e.target.value) || 0 })}
                />
              </div>

              <div className="cfm-field full">
                <label>RECEITA / FATURAMENTO (R$)</label>
                <input 
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Ex: 5000.00"
                  value={formData.estimated_revenue}
                  onChange={e => setFormData({ ...formData, estimated_revenue: parseFloat(e.target.value) || 0 })}
                />
              </div>

              <div className="cfm-field full">
                <label>VINCULAR A UM CONTRATO (SLA)</label>
                <div className="cfm-contract-checklist">
                  {fetchingContracts ? (
                    <div className="cfm-loading-inline">Carregando contratos...</div>
                  ) : contracts.length === 0 ? (
                    <div className="cfm-no-contracts">Nenhum contrato encontrado. Crie um no Painel de SLA.</div>
                  ) : (
                    contracts.map(contract => (
                      <div 
                        key={contract.id} 
                        className={`cfm-contract-item ${formData.contract_id === contract.id ? 'selected' : ''}`}
                        onClick={() => setFormData({ ...formData, contract_id: formData.contract_id === contract.id ? null : contract.id })}
                      >
                        <div className="cfm-checkbox">
                          {formData.contract_id === contract.id && <div className="cfm-checkbox-inner" />}
                        </div>
                        <div className="cfm-contract-info">
                          <span className="cfm-contract-name">{contract.name}</span>
                          <span className="cfm-contract-client">{contract.client}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="cfm-footer">
            <button type="button" className="cfm-btn-cancel" onClick={onClose}>Cancelar</button>
            <button type="submit" className="cfm-btn-save" disabled={loading}>
              {loading ? 'Salvando...' : editingCustomer ? 'Salvar Alterações' : 'Cadastrar Cliente'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
