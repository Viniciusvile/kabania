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
    employee_count: 0
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (editingCustomer) {
      setFormData({
        name: editingCustomer.name || '',
        address: editingCustomer.address || '',
        email: editingCustomer.email || '',
        phone: editingCustomer.phone || '',
        employee_count: editingCustomer.employee_count || 0
      });
    }
  }, [editingCustomer]);

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

              <div className="cfm-field full">
                <label>NÚMERO DE FUNCIONÁRIOS</label>
                <input 
                  type="number"
                  min="0"
                  value={formData.employee_count}
                  onChange={e => setFormData({ ...formData, employee_count: parseInt(e.target.value) || 0 })}
                />
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
