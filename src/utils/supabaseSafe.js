/**
 * Utilitário para evitar o erro "Lock broken by another request" do Supabase.
 * Este erro ocorre quando múltiplas requisições tentam acessar o IndexedDB ao mesmo tempo.
 */

export const safeQuery = async (queryFn, retries = 3, delay = 1000) => {
  for (let i = 0; i < retries; i++) {
    try {
      // Garantir que chamamos a função se for uma função, ou apenas await se for promessa direta
      const result = typeof queryFn === 'function' ? await queryFn() : await queryFn;
      
      if (result?.error && (
          result.error.message?.includes('Lock broken') || 
          result.error.message?.includes('5000ms') ||
          result.error.message?.includes('indexedDB')
      )) {
        throw result.error;
      }
      return result;
    } catch (err) {
      const errorMsg = err.message || "";
      const isLockError = errorMsg.includes('Lock broken') || 
                          errorMsg.includes('indexedDB') || 
                          errorMsg.includes('5000ms');
      
      if (isLockError && i < retries - 1) {
        console.warn(`[Supabase Safe] Conflito de Lock (${errorMsg}). Tentativa ${i + 1}/${retries}...`);
        await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
        continue;
      }
      throw err;
    }
  }
};

/**
 * Stagger helper para carregar dados sequencialmente ou com pequeno atraso
 */
export const stagger = (ms) => new Promise(resolve => setTimeout(resolve, ms));
