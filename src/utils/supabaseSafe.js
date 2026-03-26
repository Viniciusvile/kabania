/**
 * Utilitário para evitar o erro "Lock broken by another request" do Supabase.
 * 
 * ⚠️ ATENÇÃO: O segundo argumento deve ser um NÚMERO (retries).
 * Se uma string for passada (padrão legado), é tratada como descrição de log
 * e os defaults são usados para retries e delay.
 */
export const safeQuery = async (queryFn, retries = 5, delay = 1000, description = '') => {
  // Compatibilidade com chamadas legadas: safeQuery(fn, "descrição")
  if (typeof retries === 'string') {
    description = retries;
    retries = 5;
    delay = 1000;
  }

  for (let i = 0; i < retries; i++) {
    try {
      const result = typeof queryFn === 'function' ? await queryFn() : await queryFn;
      
      const errorMessage = result?.error?.message || "";
      if (result?.error && (
          errorMessage.includes('Lock broken') || 
          errorMessage.includes('5000ms') ||
          errorMessage.includes('steal') ||
          errorMessage.includes('indexedDB')
      )) {
        throw result.error;
      }
      return result;
    } catch (err) {
      const errorMsg = err.message || "";
      const isLockError = errorMsg.includes('Lock broken') || 
                          errorMsg.includes('indexedDB') || 
                          errorMsg.includes('steal') ||
                          errorMsg.includes('5000ms');
      
      if (isLockError && i < retries - 1) {
        // Adiciona um jitter aleatório para evitar que múltiplas abas tentem "roubar" o lock ao mesmo tempo
        const jitter = Math.random() * 200; 
        const backoff = (delay * Math.pow(2, i)) + jitter;
        console.warn(`[Supabase Safe]${description ? ` (${description})` : ''} Conflito de Lock (${errorMsg}). Tentativa ${i + 1}/${retries} em ${Math.round(backoff)}ms...`);
        await new Promise(resolve => setTimeout(resolve, backoff));
        continue;
      }
      
      // Se chegamos aqui e ainda é um erro de lock, retornamos o erro estruturado em vez de dar throw
      // Isso evita o pop-up de "Promise Rejection" que incomoda o usuário
      if (isLockError) {
        console.error("[Supabase Safe] Erro de Lock persistente após retentativas. Ignorando throw para evitar alerta na UI.");
        return { data: null, error: err, isLockFailure: true };
      }
      
      throw err;
    }
  }
};

/**
 * Stagger helper para carregar dados sequencialmente ou com pequeno atraso
 */
export const stagger = (ms) => new Promise(resolve => setTimeout(resolve, ms));
