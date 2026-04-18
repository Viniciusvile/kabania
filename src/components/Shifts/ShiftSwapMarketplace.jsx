import React, { useState, useEffect, useCallback } from 'react';
import { X, ArrowLeftRight, Plus, Clock, CheckCircle, XCircle, RefreshCw, Loader, Calendar } from 'lucide-react';
import {
  listSwaps, createSwap, acceptSwap, updateSwapStatus,
  getUserShifts, subscribeToSwaps
} from '../../services/swapService';
import './ShiftSwapMarketplace.css';

function formatShiftTime(start, end) {
  if (!start) return '—';
  const fmt = iso => new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const day = new Date(start).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  return `${day} · ${fmt(start)}–${fmt(end)}`;
}

function StatusBadge({ status }) {
  const map = {
    pending:   { label: 'Disponível', cls: 'ssm-badge-pending' },
    accepted:  { label: 'Aceita',     cls: 'ssm-badge-accepted' },
    rejected:  { label: 'Rejeitada',  cls: 'ssm-badge-rejected' },
    cancelled: { label: 'Cancelada',  cls: 'ssm-badge-cancelled' },
  };
  const { label, cls } = map[status] || map.pending;
  return <span className={`ssm-badge ${cls}`}>{label}</span>;
}

export default function ShiftSwapMarketplace({ companyId, currentUser, userRole, onClose }) {
  const isAdmin = userRole === 'admin';

  const [swaps, setSwaps]               = useState([]);
  const [myShifts, setMyShifts]         = useState([]);
  const [loading, setLoading]           = useState(true);
  const [tab, setTab]                   = useState('all');  // 'all' | 'mine'
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedShift, setSelectedShift]   = useState('');
  const [reason, setReason]             = useState('');
  const [desiredDate, setDesiredDate]   = useState('');
  const [submitting, setSubmitting]     = useState(false);
  const [actionLoading, setActionLoading] = useState(null); // swapId being actioned

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [swapList, shiftList] = await Promise.all([
        listSwaps(companyId),
        getUserShifts(companyId, currentUser),
      ]);
      setSwaps(swapList);
      setMyShifts(shiftList);
    } catch (err) {
      console.error('[ShiftSwapMarketplace] load', err);
    } finally {
      setLoading(false);
    }
  }, [companyId, currentUser]);

  useEffect(() => {
    load();
    const unsub = subscribeToSwaps(companyId, load);
    return unsub;
  }, [load, companyId]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!selectedShift) return;
    setSubmitting(true);
    try {
      await createSwap({
        offeredShiftId: selectedShift,
        proposerId: currentUser,
        companyId,
        reason,
        desiredDate: desiredDate || null,
      });
      setShowCreateForm(false);
      setSelectedShift('');
      setReason('');
      setDesiredDate('');
    } catch (err) {
      alert('Erro ao publicar oferta: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAccept = async (swap) => {
    setActionLoading(swap.id);
    try {
      await acceptSwap({ swapId: swap.id, acceptorId: currentUser });
    } catch (err) {
      alert('Erro ao aceitar: ' + err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (swap) => {
    setActionLoading(swap.id);
    try {
      await updateSwapStatus(swap.id, 'rejected');
    } catch (err) {
      alert('Erro ao rejeitar: ' + err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancel = async (swap) => {
    setActionLoading(swap.id);
    try {
      await updateSwapStatus(swap.id, 'cancelled');
    } catch (err) {
      alert('Erro ao cancelar: ' + err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const filtered = swaps.filter(s => {
    if (tab === 'mine') return s.proposer_id === currentUser;
    return s.status === 'pending';
  });

  const pendingCount = swaps.filter(s => s.status === 'pending').length;
  const mineCount    = swaps.filter(s => s.proposer_id === currentUser).length;

  return (
    <div className="ssm-overlay" onClick={onClose}>
      <div className="ssm-panel" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="ssm-header">
          <div className="ssm-header-left">
            <div className="ssm-header-icon"><ArrowLeftRight size={18} /></div>
            <div>
              <h2 className="ssm-title">Marketplace de Trocas</h2>
              <p className="ssm-subtitle">Publique e aceite trocas de escala com sua equipe</p>
            </div>
          </div>
          <div className="ssm-header-actions">
            <button className="ssm-refresh-btn" onClick={load} title="Atualizar">
              <RefreshCw size={16} />
            </button>
            <button className="ssm-close-btn" onClick={onClose}><X size={20} /></button>
          </div>
        </div>

        {/* Tabs */}
        <div className="ssm-tabs">
          <button className={`ssm-tab ${tab === 'all' ? 'active' : ''}`} onClick={() => setTab('all')}>
            Disponíveis <span className="ssm-tab-count">{pendingCount}</span>
          </button>
          <button className={`ssm-tab ${tab === 'mine' ? 'active' : ''}`} onClick={() => setTab('mine')}>
            Minhas Ofertas <span className="ssm-tab-count">{mineCount}</span>
          </button>
        </div>

        {/* Create Form */}
        {showCreateForm ? (
          <form className="ssm-create-form" onSubmit={handleCreate}>
            <h3 className="ssm-form-title">Oferecer Minha Escala</h3>

            <div className="ssm-field">
              <label>Escala que desejo trocar</label>
              <select value={selectedShift} onChange={e => setSelectedShift(e.target.value)} required>
                <option value="">Selecione uma escala...</option>
                {myShifts.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.activity_name} · {formatShiftTime(s.start_time, s.end_time)}
                  </option>
                ))}
              </select>
              {myShifts.length === 0 && (
                <p className="ssm-field-hint">Nenhuma escala futura encontrada para você.</p>
              )}
            </div>

            <div className="ssm-field">
              <label>Data desejada para a troca (opcional)</label>
              <input type="date" value={desiredDate} onChange={e => setDesiredDate(e.target.value)} />
            </div>

            <div className="ssm-field">
              <label>Motivo (opcional)</label>
              <textarea
                placeholder="Ex: Compromisso médico, viagem..."
                value={reason}
                onChange={e => setReason(e.target.value)}
                rows={2}
              />
            </div>

            <div className="ssm-form-actions">
              <button type="button" className="ssm-btn-ghost" onClick={() => setShowCreateForm(false)}>
                Cancelar
              </button>
              <button type="submit" className="ssm-btn-primary" disabled={submitting || !selectedShift}>
                {submitting ? <Loader size={14} className="ssm-spin" /> : <Plus size={14} />}
                Publicar Oferta
              </button>
            </div>
          </form>
        ) : (
          <div className="ssm-create-trigger">
            <button className="ssm-btn-primary" onClick={() => setShowCreateForm(true)}>
              <Plus size={16} /> Oferecer Minha Escala
            </button>
          </div>
        )}

        {/* List */}
        <div className="ssm-list">
          {loading && (
            <div className="ssm-empty">
              <Loader size={24} className="ssm-spin ssm-empty-icon" />
              <p>Carregando ofertas...</p>
            </div>
          )}

          {!loading && filtered.length === 0 && (
            <div className="ssm-empty">
              <ArrowLeftRight size={40} className="ssm-empty-icon" strokeWidth={1} />
              <p>{tab === 'mine' ? 'Você ainda não publicou nenhuma oferta.' : 'Nenhuma oferta disponível no momento.'}</p>
            </div>
          )}

          {!loading && filtered.map(swap => {
            const shift = swap.offered_shift;
            const isOwner  = swap.proposer_id === currentUser;
            const isPending = swap.status === 'pending';
            const actioning = actionLoading === swap.id;

            return (
              <div key={swap.id} className={`ssm-card ${swap.status !== 'pending' ? 'ssm-card-inactive' : ''}`}>
                <div className="ssm-card-header">
                  <div className="ssm-card-icon">
                    <Clock size={16} />
                  </div>
                  <div className="ssm-card-info">
                    <span className="ssm-card-activity">{shift?.activity_name || 'Escala'}</span>
                    <span className="ssm-card-env">{shift?.environment_name}</span>
                  </div>
                  <StatusBadge status={swap.status} />
                </div>

                <div className="ssm-card-time">
                  <Calendar size={13} />
                  {formatShiftTime(shift?.start_time, shift?.end_time)}
                </div>

                <div className="ssm-card-proposer">
                  Oferta de <strong>{isOwner ? 'Você' : swap.proposer_id.split('@')[0]}</strong>
                  {swap.reason && <span className="ssm-card-reason"> · {swap.reason}</span>}
                </div>

                {swap.desired_date && (
                  <div className="ssm-card-desired">
                    Prefere trocar para: {new Date(swap.desired_date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                  </div>
                )}

                {isPending && (
                  <div className="ssm-card-actions">
                    {!isOwner && (
                      <button
                        className="ssm-action-btn ssm-action-accept"
                        onClick={() => handleAccept(swap)}
                        disabled={actioning}
                      >
                        {actioning ? <Loader size={13} className="ssm-spin" /> : <CheckCircle size={13} />}
                        Aceitar Troca
                      </button>
                    )}
                    {isOwner && (
                      <button
                        className="ssm-action-btn ssm-action-cancel"
                        onClick={() => handleCancel(swap)}
                        disabled={actioning}
                      >
                        {actioning ? <Loader size={13} className="ssm-spin" /> : <XCircle size={13} />}
                        Cancelar Oferta
                      </button>
                    )}
                    {isAdmin && !isOwner && (
                      <button
                        className="ssm-action-btn ssm-action-reject"
                        onClick={() => handleReject(swap)}
                        disabled={actioning}
                      >
                        <XCircle size={13} /> Rejeitar
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
