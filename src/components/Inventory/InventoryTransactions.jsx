import React, { useState, useEffect } from 'react';
import { ArrowDownCircle, ArrowUpCircle, User, Calendar, Tag, Search, Filter } from 'lucide-react';
import { supabase } from '../../supabaseClient';
import { stagger } from '../../utils/supabaseSafe';

export default function InventoryTransactions({ companyId }) {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('all'); // all, in, out

  const fetchTransactions = async () => {
    if (!companyId) return;
    setLoading(true);
    
    try {
      let query = supabase
        .from('inventory_transactions')
        .select(`
          *,
          inventory_items (
            name,
            unit
          )
        `)
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (filterType !== 'all') {
        query = query.eq('type', filterType);
      }

      const { data, error } = await query;

      if (!error && data) {
        setTransactions(data);
      }
    } catch (e) {
      console.error('Error fetching transactions:', e);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchTransactions();
  }, [companyId, filterType]);

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  return (
    <div className="inventory-transactions-container">
      <div className="transactions-filters">
        <div className="filter-group">
          <Filter size={16} className="text-blue-400" />
          <button 
            className={`filter-btn ${filterType === 'all' ? 'active' : ''}`}
            onClick={() => setFilterType('all')}
          >
            Tudo
          </button>
          <button 
            className={`filter-btn ${filterType === 'in' ? 'active' : ''}`}
            onClick={() => setFilterType('in')}
          >
            Entradas
          </button>
          <button 
            className={`filter-btn ${filterType === 'out' ? 'active' : ''}`}
            onClick={() => setFilterType('out')}
          >
            Saídas
          </button>
        </div>
        <div className="transactions-count">
          {transactions.length} registros encontrados
        </div>
      </div>

      <div className="transactions-list">
        {loading ? (
          <div className="loading-state">
            <div className="inv-spinner" />
            <span>Carregando histórico...</span>
          </div>
        ) : transactions.length === 0 ? (
          <div className="empty-state">
            <Search size={48} className="empty-state-icon" />
            <h2>Nenhuma movimentação encontrada</h2>
            <p>Ajuste os filtros ou realize operações no estoque.</p>
          </div>
        ) : (
          <div className="transactions-table-wrapper">
            <table className="premium-table">
              <thead>
                <tr>
                  <th>TIPO</th>
                  <th>ITEM</th>
                  <th>QUANTIDADE</th>
                  <th>USUÁRIO</th>
                  <th>NOTAS</th>
                  <th>DATA/HORA</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => (
                  <tr key={tx.id} className="transaction-row">
                    <td>
                      <div className={`type-badge ${tx.type}`}>
                        {tx.type === 'in' ? (
                          <><ArrowUpCircle size={14} /> Entrada</>
                        ) : (
                          <><ArrowDownCircle size={14} /> Saída</>
                        )}
                      </div>
                    </td>
                    <td>
                      <div className="item-cell">
                        <Tag size={14} className="text-gray-400" />
                        <span>{tx.inventory_items?.name || 'Item excluído'}</span>
                      </div>
                    </td>
                    <td className={`qty-cell ${tx.type}`}>
                      {tx.type === 'in' ? '+' : '-'}{tx.quantity} {tx.inventory_items?.unit || ''}
                    </td>
                    <td>
                      <div className="user-cell">
                        <User size={14} className="text-gray-400" />
                        <span>{tx.user_email}</span>
                      </div>
                    </td>
                    <td className="notes-cell">{tx.notes || '-'}</td>
                    <td>
                      <div className="date-cell">
                        <Calendar size={14} className="text-gray-400" />
                        <span>{formatDate(tx.created_at)}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
