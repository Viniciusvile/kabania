import { supabase } from '../supabaseClient';

/**
 * Service to manage company-wide activity history (audit log).
 * Stores events in Supabase.
 */

/**
 * Log a new event to the company history.
 */
export const logEvent = async (companyId, userEmail, action, details) => {
  if (!companyId) return;

  const { error } = await supabase.from('audit_logs').insert([
    {
      company_id: companyId,
      user_email: userEmail,
      action: action,
      details: details
    }
  ]);

  if (error) {
    console.error('Error logging audit event:', error);
  }
};

/**
 * Retrieve the event history for a specific company.
 */
export const getHistory = async (companyId) => {
  if (!companyId) return [];
  
  const { data, error } = await supabase
    .from('audit_logs')
    .select('*')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })
    .limit(500);

  if (!error && data) {
    // Map back to internal object structure for consistency
    return data.map(log => ({
      id: String(log.id),
      timestamp: log.created_at,
      userEmail: log.user_email,
      action: log.action,
      details: log.details
    }));
  }
  return [];
};

/**
 * Clear history not implemented for cloud to avoid data loss, 
 * but kept for interface consistency.
 */
export const clearHistory = async (companyId) => {
  if (!companyId) return;
  // Admin action would go here
};
