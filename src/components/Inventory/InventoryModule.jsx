import React, { useState, useEffect } from 'react';
import { PackageSearch, Plus, LayoutGrid, ListMinus } from 'lucide-react';
import { supabase } from '../../supabaseClient';
import { safeQuery, stagger } from '../../utils/supabaseSafe';
import InventoryList from './InventoryList';
import './InventoryModule.css';

export default function InventoryModule({ companyId, currentUser, userRole }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('list');

  const fetchItems = async () => {
    if (!companyId) return;
    
    // 1. OTIMIZAÇÃO: Instant Hydration (Lê do cache a cada mudança de companyId)
    const cacheKey = `synapse_inventory_${companyId}`;
    const cached = localStorage.getItem(cacheKey);
    
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        setItems(parsed);
        setLoading(false); // Remove o "Carregando" imediatamente
      } catch (e) {
        setLoading(true);
      }
    } else {
      setLoading(true);
    }
    
    // Pequeno atraso para garantir que a sessão Auth foi restaurada após um F5 (Reload)
    await stagger(300);
    
    // 2. BACKGROUND SYNC: Puxa dados frescos sem bloquear a UI
    try {
      const { data, error } = await safeQuery(() => 
        supabase
          .from('inventory_items')
          .select('*')
          .eq('company_id', companyId)
          .order('name', { ascending: true })
      );

      if (!error && data) {
        setItems(data);
        localStorage.setItem(cacheKey, JSON.stringify(data));
      }
    } catch (e) {
      console.error('Inventory fetch error:', e);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchItems();
  }, [companyId]);

  return (
    <div className="inventory-module">
      {/* 1. Header */}
      <div className="inventory-header">
        <div className="header-info">
          <div className="header-title-row">
            <div className="header-icon-box">
              <PackageSearch className="text-blue-400" size={32} />
            </div>
            <h1>Estoque Inteligente</h1>
          </div>
          <p className="header-subtitle">
            Gestão de insumos, ativos e predição de reposição estratégica.
          </p>
        </div>
        
        <div className="header-actions">
          <button className="btn btn-secondary" onClick={fetchItems}>
            Atualizar
          </button>
        </div>
      </div>

      {/* 2. Tabs */}
      <div className="inventory-tabs">
        <button
          className={`tab-btn ${activeTab === 'list' ? 'active' : ''}`}
          onClick={() => setActiveTab('list')}
        >
          <LayoutGrid size={20} />
          Inventário Atual
        </button>
        <button
          className={`tab-btn ${activeTab === 'transactions' ? 'active' : ''}`}
          onClick={() => setActiveTab('transactions')}
        >
          <ListMinus size={20} />
          Movimentações
        </button>
      </div>

      {/* 3. Content Area */}
      <div className="inventory-content-box">
        {activeTab === 'list' && (
          <InventoryList 
            items={items} 
            loading={loading} 
            companyId={companyId}
            currentUser={currentUser}
            onRefresh={fetchItems}
          />
        )}
        {activeTab === 'transactions' && (
          <div className="empty-state">
            <ListMinus size={80} className="empty-state-icon" />
            <h2>Histórico de Movimentações</h2>
            <p>Em breve: Visão detalhada de consumo por cargo, unidade e alertas de sazonalidade via IA.</p>
          </div>
        )}
      </div>
    </div>
  );
}
