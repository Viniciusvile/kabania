/**
 * swapService.js — Shift Swap Marketplace backend operations.
 * All reads/writes go through Supabase; realtime via subscription.
 */
import { supabase } from '../supabaseClient';

/**
 * Fetches all swap offers for a company, enriched with shift data.
 * @param {string} companyId
 * @returns {Promise<object[]>}
 */
export async function listSwaps(companyId) {
  const { data, error } = await supabase
    .from('shift_swaps')
    .select(`
      *,
      offered_shift:offered_shift_id (
        id, start_time, end_time, activity_name, environment_name
      )
    `)
    .eq('company_id', companyId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

/**
 * Creates a new swap offer.
 * @param {{ offeredShiftId: string, proposerId: string, companyId: string, reason?: string, desiredDate?: string }} params
 * @returns {Promise<object>}
 */
export async function createSwap({ offeredShiftId, proposerId, companyId, reason = '', desiredDate = null }) {
  const { data, error } = await supabase
    .from('shift_swaps')
    .insert([{
      company_id: companyId,
      offered_shift_id: offeredShiftId,
      proposer_id: proposerId,
      reason,
      desired_date: desiredDate,
      status: 'pending',
    }])
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Accepts a swap offer. Optionally links a requested shift for the trigger to execute.
 * @param {{ swapId: string, acceptorId: string, requestedShiftId?: string }} params
 */
export async function acceptSwap({ swapId, acceptorId, requestedShiftId = null }) {
  const { error } = await supabase
    .from('shift_swaps')
    .update({
      status: 'accepted',
      acceptor_id: acceptorId,
      ...(requestedShiftId ? { requested_shift_id: requestedShiftId } : {}),
    })
    .eq('id', swapId);

  if (error) throw error;
}

/**
 * Rejects or cancels a swap offer.
 * @param {string} swapId
 * @param {'rejected'|'cancelled'} status
 */
export async function updateSwapStatus(swapId, status) {
  const { error } = await supabase
    .from('shift_swaps')
    .update({ status })
    .eq('id', swapId);

  if (error) throw error;
}

/**
 * Fetches all shifts assigned to a specific user (by email) for a company.
 * Used to populate the "offer my shift" selector.
 * @param {string} companyId
 * @param {string} userEmail
 */
export async function getUserShifts(companyId, userEmail) {
  const { data: assignments, error } = await supabase
    .from('shift_assignments')
    .select(`
      shift_id,
      shifts (
        id, start_time, end_time, activity_name, environment_name, company_id
      )
    `)
    .eq('collaborator_id', userEmail);

  if (error) throw error;

  return (assignments || [])
    .map(a => a.shifts)
    .filter(s => s && s.company_id === companyId && new Date(s.start_time) > new Date());
}

/**
 * Subscribes to realtime changes on shift_swaps for a company.
 * @param {string} companyId
 * @param {function} onChange
 * @returns {function} unsubscribe
 */
export function subscribeToSwaps(companyId, onChange) {
  const channel = supabase
    .channel(`shift_swaps_${companyId}`)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'shift_swaps',
      filter: `company_id=eq.${companyId}`,
    }, onChange)
    .subscribe();

  return () => supabase.removeChannel(channel);
}
