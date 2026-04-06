import React from 'react';
import { MapPin, Mail, Phone, Users, Edit2, Trash2, Calendar } from 'lucide-react';
import './CustomerCard.css';

export default function CustomerCard({ customer, onEdit, onDelete }) {
  const initials = customer.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

  return (
    <div className="customer-card animate-fade-in">


      <div className="cc-header">
        <div className="cc-avatar">{initials}</div>
        <div className="cc-header-right">
          <div className="cc-badge-employees">
            {customer.employee_count} func.
          </div>
          <div className="cc-actions">
            <button className="cp-action-btn" onClick={onEdit} title="Editar">
              <Edit2 size={14} />
            </button>
            <button className="cp-action-btn danger" onClick={onDelete} title="Excluir">
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      </div>

      <div>
        <h3 className="cc-name">{customer.name}</h3>
        <div className="cc-info-grid">
          {customer.address && (
            <div className="cc-info-item">
              <MapPin size={14} />
              <span>{customer.address}</span>
            </div>
          )}
          {customer.email && (
            <div className="cc-info-item">
              <Mail size={14} />
              <span>{customer.email}</span>
            </div>
          )}
          {customer.phone && (
            <div className="cc-info-item">
              <Phone size={14} />
              <span>{customer.phone}</span>
            </div>
          )}
          <div className="cc-info-item">
            <Calendar size={14} />
            <span>Cliente desde {new Date(customer.created_at).toLocaleDateString('pt-BR')}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
