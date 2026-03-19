/**
 * Utilitário para evitar o erro "Lock broken by another request" do Supabase.
 * Este erro ocorre quando múltiplas requisições tentam acessar o IndexedDB ao mesmo tempo.
 */

export const safeQuery = async (queryFn, retries = 5, delay = 1000) => {
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
        const backoff = delay * Math.pow(2, i); // Exponential backoff
        console.warn(`[Supabase Safe] Conflito de Lock (${errorMsg}). Tentativa ${i + 1}/${retries} em ${backoff}ms...`);
        await new Promise(resolve => setTimeout(resolve, backoff));
        continue;
      }
      
      // Se chegamos no limite de erros de lock, sugerir refresh
      if (isLockError) {
        console.error("[Supabase Safe] Erro de Lock persistente. Sistema pode estar travado.");
      }
      throw err;
    }
  }
};

/**
 * Stagger helper para carregar dados sequencialmente ou com pequeno atraso
 */
export const stagger = (ms) => new Promise(resolve => setTimeout(resolve, ms));
