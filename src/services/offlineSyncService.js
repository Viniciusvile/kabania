/**
 * Serviço de Gerenciamento Offline
 * Usa LocalStorage para interceptar e salvar ações cruciais quando não há rede.
 */

const OFFLINE_QUEUE_KEY = 'synapse_offline_actions';

export function saveActionToOfflineQueue(actionName, payload) {
  try {
    const queue = JSON.parse(localStorage.getItem(OFFLINE_QUEUE_KEY) || '[]');
    queue.push({
      id: crypto.randomUUID(),
      action: actionName,
      payload,
      timestamp: new Date().toISOString()
    });
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
    console.log(`[Offline Sync] Action ${actionName} saved locally.`);
    return true;
  } catch (err) {
    console.error('Falha ao salvar ação offline', err);
    return false;
  }
}

export function getOfflineQueue() {
  try {
    return JSON.parse(localStorage.getItem(OFFLINE_QUEUE_KEY) || '[]');
  } catch {
    return [];
  }
}

export function removeActionFromQueue(actionId) {
  try {
    const queue = getOfflineQueue();
    const newQueue = queue.filter(q => q.id !== actionId);
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(newQueue));
  } catch (err) {
    console.error(err);
  }
}

export function clearOfflineQueue() {
  localStorage.removeItem(OFFLINE_QUEUE_KEY);
}

// Sincronizador de Retorno à Rede
export async function syncOfflineQueue(supabase) {
  if (!navigator.onLine) return { processed: 0, failed: 0 };
  
  const queue = getOfflineQueue();
  if (queue.length === 0) return { processed: 0, failed: 0 };
  
  console.log(`[Offline Sync] Sincronizando ${queue.length} ações pendentes...`);
  
  let processed = 0;
  let failed = 0;

  for (const item of queue) {
    try {
      if (item.action === 'register_shift_checkin') {
        const { error } = await supabase.rpc('register_shift_checkin', item.payload);
        if (error) throw error;
        processed++;
        removeActionFromQueue(item.id);
      } else {
        // Drop unknown actions
        removeActionFromQueue(item.id);
      }
    } catch (err) {
      console.error(`Falha ao sincronizar item ${item.id}`, err);
      failed++;
    }
  }

  return { processed, failed };
}
