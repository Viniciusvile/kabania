import React, { useState, useMemo } from 'react';
import { Package, AlertTriangle, ArrowDownCircle, LayoutGrid, Plus, CheckCircle } from 'lucide-react';
import { supabase } from '../../supabaseClient';

export default function InventoryList({ items, loading, companyId, currentUser, onRefresh }) {
  const [isWithdrawing, setIsWithdrawing] = useState(null);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [newItem, setNewItem] = useState({
    name: '',
    category: 'Limpeza',
    quantity: 0,
    min_threshold: 5,
    unit: 'un'
  });

  const handleWithdraw = async (item) => {
    if (!withdrawAmount || isNaN(withdrawAmount) || Number(withdrawAmount) <= 0) return;
    if (Number(withdrawAmount) > item.quantity) {
      alert('Quantidade maior que o estoque atual.');
      return;
    }
    try {
      const { error } = await supabase.from('inventory_transactions').insert([{
        item_id: item.id,
        company_id: companyId,
        type: 'out',
        quantity: Number(withdrawAmount),
        user_email: currentUser,
        notes: 'Retirada manual'
      }]);
      if (!error) {
        setIsWithdrawing(null);
        setWithdrawAmount('');
        onRefresh();
      }
    } catch (e) { console.error(e); }
  };

  const handleAddItem = async (e) => {
    e.preventDefault();
    if (!newItem.name || !companyId) return;
    setIsSaving(true);
    try {
      const { error } = await supabase.from('inventory_items').insert([{
        company_id: companyId,
        ...newItem,
        quantity: Number(newItem.quantity),
        min_threshold: Number(newItem.min_threshold)
      }]);
      if (!error) {
        setSaveSuccess(true);
        setNewItem({ name: '', category: 'Limpeza', quantity: 0, min_threshold: 5, unit: 'un' });
        onRefresh();
        setTimeout(() => setSaveSuccess(false), 2500);
      } else {
        alert('Erro ao criar item.');
        console.error(error);
      }
    } catch (e) { console.error(e); }
    setIsSaving(false);
  };

  const isLowPreview = Number(newItem.quantity) <= Number(newItem.min_threshold);
  const previewProgress = Math.min(100, (Number(newItem.quantity) / (Number(newItem.min_threshold) * 3 || 1)) * 100);

  return (
    <div className="inventory-split-layout">

      {/* ══════════════════════════════════════════════════════
          LEFT PANEL — Inventory Grid
      ══════════════════════════════════════════════════════ */}
      <div className="inv-panel inv-panel-list">
        <div className="inv-panel-header">
          <div className="inv-panel-title">
            <LayoutGrid size={18} />
            <span>Inventário Atual</span>
          </div>
          <span className="inv-count-badge">{items.length} itens</span>
        </div>

        <div className="inv-list-body">
          {loading ? (
            <div className="empty-state"><div className="inv-spinner" /></div>
          ) : items.length === 0 ? (
            <div className="empty-state">
              <Package size={64} className="empty-state-icon" />
              <h2>Estoque Vazio</h2>
              <p>Adicione o primeiro item usando o painel ao lado.</p>
            </div>
          ) : (
            <div className="inventory-grid">
              {useMemo(() => items.map(item => {
                const isLow = item.quantity <= item.min_threshold;
                return (
                  <div key={item.id} className={`inventory-card ${isLow ? 'low-stock' : ''}`}>
                    {isLow && (
                      <div className="stock-alert">
                        <AlertTriangle size={12} /> REPOSIÇÃO NECESSÁRIA
                      </div>
                    )}
                    <h3 className="item-name">{item.name}</h3>
                    <span className="item-category">{item.category}</span>

                    <div className="item-stats">
                      <div className="quantity-info">
                        <span className={`quantity-value ${isLow ? 'danger' : 'success'}`}>{item.quantity}</span>
                        <span className="unit-label">{item.unit}</span>
                      </div>
                      <div className="card-actions">
                        <button
                          onClick={() => setIsWithdrawing(isWithdrawing === item.id ? null : item.id)}
                          className="withdraw-btn"
                          title="Registrar Saída"
                        >
                          <ArrowDownCircle size={22} />
                        </button>
                      </div>
                    </div>

                    <div className="progress-shell">
                      <div
                        className={`progress-bar ${isLow ? 'bg-red' : 'bg-blue'}`}
                        style={{ width: `${Math.min(100, (item.quantity / (item.min_threshold * 3 || 1)) * 100)}%` }}
                      />
                    </div>
                    <div className="threshold-info">Mínimo: {item.min_threshold} {item.unit}</div>

                    {isWithdrawing === item.id && (
                      <div className="withdraw-overlay">
                        <div className="withdraw-form">
                          <h4>Retirar {item.name}</h4>
                          <input
                            type="number"
                            className="withdraw-input"
                            placeholder="Qtd."
                            value={withdrawAmount}
                            onChange={e => setWithdrawAmount(e.target.value)}
                            autoFocus
                          />
                          <div className="withdraw-actions">
                            <button onClick={() => setIsWithdrawing(null)} className="btn-cancel">Fechar</button>
                            <button onClick={() => handleWithdraw(item)} className="btn-confirm">Baixar</button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              }), [items, isWithdrawing, withdrawAmount])}
            </div>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════
          RIGHT PANEL — Add New Item (always visible)
      ══════════════════════════════════════════════════════ */}
      <div className="inv-panel inv-panel-form">
        <div className="inv-panel-header">
          <div className="inv-panel-title">
            <Plus size={18} />
            <span>Novo Item</span>
          </div>
          <div className="pulse-dot" />
        </div>

        <div className="inv-form-body">
          {/* Live Preview Card */}
          <div className={`inv-preview-card ${isLowPreview ? 'low-stock' : ''}`}>
            <div className="preview-label">
              <div className="pulse-dot small" />
              LIVE PREVIEW
            </div>
            {isLowPreview && (
              <div className="stock-alert">
                <AlertTriangle size={10} /> REPOSIÇÃO NECESSÁRIA
              </div>
            )}
            <h3 className="item-name">{newItem.name || 'Nome do Item'}</h3>
            <span className="item-category">{newItem.category}</span>
            <div className="item-stats">
              <div className="quantity-info">
                <span className={`quantity-value ${isLowPreview ? 'danger' : 'success'}`}>
                  {newItem.quantity || 0}
                </span>
                <span className="unit-label">{newItem.unit}</span>
              </div>
              <ArrowDownCircle size={18} style={{ opacity: 0.2 }} />
            </div>
            <div className="progress-shell">
              <div className="progress-bar bg-blue" style={{ width: `${previewProgress}%` }} />
            </div>
            <div className="threshold-info">Mínimo: {newItem.min_threshold} {newItem.unit}</div>
          </div>

          {/* Form */}
          <form onSubmit={handleAddItem} className="inv-form">
            <div className="inv-form-section">
              <div className="section-header">
                <LayoutGrid size={14} /><span>Identificação</span>
              </div>

              <div className="form-group-premium">
                <label>NOME DO INSUMO</label>
                <div className="input-with-icon">
                  <Package size={16} className="input-icon" />
                  <input
                    required
                    type="text"
                    className="premium-input-field"
                    placeholder="Ex: Cloro Líquido, Resma A4..."
                    value={newItem.name}
                    onChange={e => setNewItem({ ...newItem, name: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-row-premium">
                <div className="form-group-premium flex-1">
                  <label>CATEGORIA</label>
                  <div className="input-with-icon">
                    <LayoutGrid size={14} className="input-icon" />
                    <select
                      className="premium-input-field"
                      value={newItem.category}
                      onChange={e => setNewItem({ ...newItem, category: e.target.value })}
                    >
                      <option value="Limpeza">Limpeza</option>
                      <option value="Manutenção">Manutenção</option>
                      <option value="Escritório">Escritório</option>
                      <option value="Equipamentos">Equipamentos</option>
                      <option value="Outros">Outros</option>
                    </select>
                  </div>
                </div>
                <div className="form-group-premium flex-1">
                  <label>UNIDADE</label>
                  <div className="input-with-icon">
                    <ArrowDownCircle size={14} className="input-icon" />
                    <select
                      className="premium-input-field"
                      value={newItem.unit}
                      onChange={e => setNewItem({ ...newItem, unit: e.target.value })}
                    >
                      <option value="un">un</option>
                      <option value="kg">kg</option>
                      <option value="l">litro</option>
                      <option value="cx">caixa</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <div className="inv-form-section">
              <div className="section-header">
                <AlertTriangle size={14} /><span>Controle e Logística</span>
              </div>
              <div className="form-row-premium">
                <div className="form-group-premium flex-1">
                  <label>QTD. INICIAL</label>
                  <input
                    required
                    type="number"
                    min="0"
                    className="premium-input-field"
                    value={newItem.quantity}
                    onChange={e => setNewItem({ ...newItem, quantity: e.target.value })}
                    style={{ paddingLeft: '1.25rem' }}
                  />
                </div>
                <div className="form-group-premium flex-1">
                  <label>MÍNIMO ALERTA</label>
                  <div className="input-with-alert">
                    <input
                      required
                      type="number"
                      min="1"
                      className="premium-input-field alert-border"
                      value={newItem.min_threshold}
                      onChange={e => setNewItem({ ...newItem, min_threshold: e.target.value })}
                      style={{ paddingLeft: '1.25rem' }}
                    />
                    <AlertTriangle size={14} className="alert-icon-inner" />
                  </div>
                </div>
              </div>
            </div>

            <button
              type="submit"
              className={`inv-submit-btn ${saveSuccess ? 'success' : ''}`}
              disabled={isSaving}
            >
              {saveSuccess ? (
                <><CheckCircle size={18} /> Cadastrado!</>
              ) : isSaving ? (
                'Salvando...'
              ) : (
                <><Plus size={18} /> Adicionar ao Estoque</>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
