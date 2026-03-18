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
  // Direct join for faster performance
  const { data, error } = await supabase
    .from('employee_profiles')
    .select(`
        *,
        profiles:profile_id ( id, name, email, avatar_url )
    `)
    .eq('company_id', companyId);
  
  if (error) throw error;

  return data.map(sData => ({
      ...sData.profiles,
      shift_profile_id: sData.id,
      role: sData.role || 'Não definido',
      max_daily_hours: sData.max_daily_hours || 8,
      max_weekly_hours: sData.max_weekly_hours || 44,
      availability_schedule: sData.availability_schedule || {}
  }));
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
        .from('view_shifts_standard')
        .select(`
            *,
            shift_assignments ( 
                id, 
                status, 
                employee_profiles ( 
                    id, 
                    role, 
                    profile_id,
                    profiles:profile_id ( name, avatar_url )
                ) 
            )
        `)
        .eq('company_id', companyId)
        .order('start_time');

    if (startDate) query = query.gte('start_time', startDate);
    if (endDate) query = query.lte('end_time', endDate);

    const { data, error } = await query;
    if (error) {
        console.error('getShifts Query Error:', error);
        return []; // Return empty array instead of throwing to prevent component hang
    }
    
    if (!data) return [];

    // Transform to include helpful counts
    return data.map(shift => ({
        ...shift,
        assigned_employees: shift.shift_assignments?.map(a => {
            // Safety check for nested profiles
            const profile = a.employee_profiles?.profiles || {};
            return {
                ...a.employee_profiles,
                assignment_id: a.id,
                assignment_status: a.status,
                name: profile.name || 'Colaborador',
                avatar_url: profile.avatar_url || null
            };
        }) || [],
        calls_count: shift.shift_calls?.length || 0,
        open_calls_count: shift.shift_calls?.filter(c => c.status === 'open').length || 0
    }));
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

// ==========================================
// SHIFT ASSIGNMENTS & CALLS (V2)
// ==========================================

export const addEmployeeToShift = async (shiftId, employeeProfileId) => {
    const { data, error } = await supabase
        .from('shift_assignments')
        .insert([{ shift_id: shiftId, employee_id: employeeProfileId }])
        .select()
        .single();
    if (error) throw error;
    return data;
};

export const removeEmployeeFromShift = async (assignmentId) => {
    const { error } = await supabase
        .from('shift_assignments')
        .delete()
        .eq('id', assignmentId);
    if (error) throw error;
};

export const updateAssignmentStatus = async (assignmentId, status) => {
    const { data, error } = await supabase
        .from('shift_assignments')
        .update({ status })
        .eq('id', assignmentId)
        .select()
        .single();
    if (error) throw error;
    return data;
};

export const getShiftStats = async (companyId) => {
    if (!companyId) return { total: 0, open: 0, inProgress: 0, concluded: '0/0' };
    
    // Fast path: use optimized server-side function
    const { data: stats, error } = await supabase.rpc('get_shift_stats_optimized', {
        p_company_id: companyId
    });
        
    if (!error && stats) return stats;

    // Fallback if RPC fails/not yet created
    const { data: shifts, error: fallbackError } = await supabase
        .from('shifts')
        .select('id, status')
        .eq('company_id', companyId);
    
    if (fallbackError) return { total: 0, open: 0, inProgress: 0, concluded: '0/0' };
    
    const total = shifts.length;
    return {
        total,
        open: shifts.filter(s => s.status === 'open' || s.status === 'scheduled').length,
        inProgress: shifts.filter(s => s.status === 'in_progress' || s.status === 'active').length,
        concluded: `${shifts.filter(s => s.status === 'completed').length}/${total}`
    };
};
