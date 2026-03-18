import { supabase } from '../supabaseClient';
import { logEvent } from './historyService';

// ==========================================
// WORK ENVIRONMENTS
// ==========================================
export const getWorkEnvironments = async (companyId) => {
  if (!companyId) return [];
  const { data, error } = await supabase
    .from('work_environments')
    .select('*')
    .eq('company_id', companyId)
    .order('name');
  if (error) throw error;
  return data;
};

export const createWorkEnvironment = async (envData) => {
  const { data, error } = await supabase
    .from('work_environments')
    .insert([envData])
    .select()
    .single();
  if (error) throw error;
  return data;
};

export const deleteWorkEnvironment = async (id) => {
  const { error } = await supabase
    .from('work_environments')
    .delete()
    .eq('id', id);
  if (error) throw error;
};

// ==========================================
// WORK ACTIVITIES
// ==========================================
export const getActivities = async (companyId) => {
  if (!companyId) return [];
  const { data, error } = await supabase
    .from('work_activities')
    .select(`
      *,
      work_environments ( name )
    `)
    .eq('company_id', companyId)
    .order('name');
  if (error) throw error;
  return data;
};

export const createWorkActivity = async (activityData) => {
  const { data, error } = await supabase
    .from('work_activities')
    .insert([activityData])
    .select()
    .single();
  if (error) throw error;
  return data;
};

export const deleteWorkActivity = async (id) => {
  const { error } = await supabase
    .from('work_activities')
    .delete()
    .eq('id', id);
  if (error) throw error;
};

// ==========================================
// EMPLOYEE PROFILES (Shift Data)
// ==========================================
export const getEmployeeProfiles = async (companyId) => {
  if (!companyId) return [];
  // Get profiles and their shift data
  const { data: shiftData, error: shiftError } = await supabase
    .from('employee_profiles')
    .select('*')
    .eq('company_id', companyId);
  
  if (shiftError) throw shiftError;

  // We should also get the baseline public.profiles for name/email
  const { data: profilesData, error: profError } = await supabase
    .from('profiles')
    .select('id, name, email')
    .eq('company_id', companyId);

  if (profError) throw profError;

  // Merge them (or return raw if we handle it in component)
  // For robustness, let's merge them here
  const merged = profilesData.map(prof => {
      const sData = shiftData.find(s => s.profile_id === prof.id);
      return {
          ...prof,
          shift_profile_id: sData?.id || null, // The UUID in employee_profiles table
          role: sData?.role || 'Não definido',
          max_daily_hours: sData?.max_daily_hours || 8,
          max_weekly_hours: sData?.max_weekly_hours || 44,
          availability_schedule: sData?.availability_schedule || {}
      };
  });
  return merged;
};

export const updateEmployeeProfile = async (profileId, companyId, updateData) => {
    // Check if employee_profile exists for this profile_id
    const { data: existing } = await supabase
        .from('employee_profiles')
        .select('id')
        .eq('profile_id', profileId)
        .single();

    if (existing) {
        const { data, error } = await supabase
            .from('employee_profiles')
            .update(updateData)
            .eq('id', existing.id)
            .select()
            .single();
        if (error) throw error;
        return data;
    } else {
        const { data, error } = await supabase
            .from('employee_profiles')
            .insert([{ ...updateData, profile_id: profileId, company_id: companyId }])
            .select()
            .single();
        if (error) throw error;
        return data;
    }
};

// ==========================================
// SHIFTS
// ==========================================
export const getShifts = async (companyId, startDate, endDate) => {
    if (!companyId) return [];
    
    let query = supabase
        .from('shifts')
        .select(`
            *,
            work_environments ( name ),
            work_activities ( name, required_role ),
            employee_profiles ( role, profile_id )
        `)
        .eq('company_id', companyId)
        .order('start_time');

    if (startDate) query = query.gte('start_time', startDate);
    if (endDate) query = query.lte('end_time', endDate);

    const { data, error } = await query;
    if (error) throw error;
    return data;
};

export const createShift = async (shiftData, userId) => {
    const { data, error } = await supabase
        .from('shifts')
        .insert([shiftData])
        .select()
        .single();
    if (error) throw error;
    
    logEvent(shiftData.company_id, userId, 'SHIFT_CREATED', `Escala criada para o ambiente ${shiftData.environment_id}`);
    return data;
};

export const deleteShift = async (shiftId) => {
    const { error } = await supabase
        .from('shifts')
        .delete()
        .eq('id', shiftId);
    if (error) throw error;
};

export const batchCreateShifts = async (shiftsData, companyId, userId) => {
    const { data, error } = await supabase
        .from('shifts')
        .insert(shiftsData)
        .select();
    if (error) throw error;
    logEvent(companyId, userId, 'SHIFTS_GENERATED', `${shiftsData.length} escalas geradas automaticamente.`);
    return data;
};
