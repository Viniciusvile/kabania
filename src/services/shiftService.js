import { supabase } from '../supabaseClient';
import { logEvent } from './historyService';
import { safeQuery } from '../utils/supabaseSafe';

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
  try {
    const { data, error } = await supabase
      .from('work_environments')
      .insert([envData])
      .select()
      .single();
    
    if (error) {
      if (error.code === '42703' && error.message.includes('id')) {
        console.warn('Fallback: Column id missing on select, retrying with minimal insert');
        const { error: insertError } = await supabase
          .from('work_environments')
          .insert([envData]);
        if (insertError) throw insertError;
        
        // Fetch it back
        const { data: fetchBack, error: fetchError } = await supabase
          .from('work_environments')
          .select('*')
          .eq('name', envData.name)
          .eq('company_id', envData.company_id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();
        if (fetchError) throw fetchError;
        return fetchBack;
      }
      throw error;
    }
    return data;
  } catch (err) {
    console.error('Error creating work environment:', err);
    throw err;
  }
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
  try {
    const { data, error } = await supabase
      .from('work_activities')
      .insert([activityData])
      .select()
      .single();
    
    if (error) {
      if (error.code === '42703' && error.message.includes('id')) {
        console.warn('Fallback: Column id missing on activity select, retrying with minimal insert');
        const { error: insertError } = await supabase
          .from('work_activities')
          .insert([activityData]);
        if (insertError) throw insertError;
        
        // Fetch it back
        const { data: fetchBack, error: fetchError } = await supabase
          .from('work_activities')
          .select('*')
          .eq('name', activityData.name)
          .eq('company_id', activityData.company_id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();
        if (fetchError) throw fetchError;
        return fetchBack;
      }
      throw error;
    }
    return data;
  } catch (err) {
    console.error('Error creating work activity:', err);
    throw err;
  }
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
      availability_schedule: sData.availability_schedule || {},
      skills: sData.skills || [],
      performance_notes: sData.performance_notes || ''
  }));
};

export const getCollaborators = async (companyId) => {
  if (!companyId) return [];
  const { data, error } = await supabase
    .from('collaborators')
    .select('*')
    .eq('company_id', companyId);
  
  if (error) throw error;

  return data.map(c => ({
      ...c,
      shift_profile_id: c.id,
      profile_id: c.id,
      role: c.specialty || 'Não definido',
      is_external: true,
      skills: [],
      avatar_url: null
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

    // Transform to include helpful counts and map view fields to component structure
    return data.map(shift => ({
        ...shift,
        work_environments: { name: shift.environment_name },
        work_activities: { 
            name: shift.activity_name, 
            required_role: shift.required_role,
            required_skills: shift.required_skills || []
        },
        intelligence_metadata: shift.intelligence_metadata || {},
        assigned_employees: shift.shift_assignments?.map(a => {
            const profile = a.employee_profiles?.profiles || {};
            return {
                ...a.employee_profiles,
                assignment_id: a.id,
                assignment_status: a.status,
                name: profile.name || 'Colaborador',
                avatar_url: profile.avatar_url || null,
                skills: a.employee_profiles?.skills || []
            };
        }) || [],
        calls_count: shift.calls_count || 0,
        open_calls_count: shift.open_calls_count || 0
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

export const updateShiftStatus = async (shiftId, status) => {
    return await safeQuery(
        () => supabase.from('shifts').update({ status }).eq('id', shiftId).select().single(),
        `Atualizando status da escala ${shiftId} para ${status}`
    );
};

export const deleteShift = async (shiftId) => {
    return await safeQuery(
        () => supabase.from('shifts').delete().eq('id', shiftId),
        `Deletando escala ${shiftId}`
    );
};

export const moveShift = async (shiftId, startTime, endTime) => {
    // Tentar via RPC (SECURITY DEFINER - bypassa RLS do PostgREST)
    const { data: rpcData, error: rpcError } = await supabase.rpc('move_shift_rpc', {
        p_shift_id: shiftId,
        p_start_time: startTime,
        p_end_time: endTime
    });

    if (!rpcError && rpcData?.success) {
        console.log('[moveShift] ✅ RPC bem-sucedida');
        return { id: shiftId, start_time: startTime, end_time: endTime };
    }

    // Fallback: update direto (pode falhar com RLS em alguns ambientes)
    if (rpcError) {
        console.warn('[moveShift] RPC indisponível, tentando update direto:', rpcError.message);
    } else if (rpcData && !rpcData.success) {
        throw new Error(rpcData.error || 'Erro ao mover escala via RPC');
    }

    // Fallback: UPDATE direto SEM .select().single() para evitar erro PostgREST 'column id does not exist'
    const { error: updateError, count } = await supabase
        .from('shifts')
        .update({ start_time: startTime, end_time: endTime, updated_at: new Date().toISOString() })
        .eq('id', shiftId);

    if (updateError) {
        console.error('[moveShift] ❌ Erro no UPDATE direto:', updateError);
        throw new Error(updateError.message || 'Erro ao mover escala. Verifique as permissões no Supabase.');
    }

    console.log('[moveShift] ✅ UPDATE direto bem-sucedido');
    return { id: shiftId, start_time: startTime, end_time: endTime };
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

export const addEmployeeToShift = async (shiftId, personId, isExternal = false) => {
    const payload = { shift_id: shiftId };
    if (isExternal) {
        payload.collaborator_id = personId;
    } else {
        payload.employee_id = personId;
    }

    return await safeQuery(
        () => supabase.from('shift_assignments').insert([payload]).select().single(),
        `Adicionando ${isExternal ? 'colaborador' : 'membro'} à escala ${shiftId}`
    );
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

export const getShiftsDashboardData = async (companyId, startDate, endDate) => {
    if (!companyId) return null;
    
    // First, try V3 (Optimized CTE approach)
    const { data, error } = await supabase.rpc('get_shifts_dashboard_data_v3', {
        p_company_id: companyId,
        p_start_date: startDate,
        p_end_date: endDate
    });
    
    if (error) {
        console.warn('getShiftsDashboardData V3 failed, falling back to V2:', error.message);
        
        // Fallback to V2 if V3 is not yet deployed
        const { data: v2Data, error: v2Error } = await supabase.rpc('get_shifts_dashboard_data_v2', {
            p_company_id: companyId,
            p_start_time: startDate,
            p_end_time: endDate
        });
        
        if (v2Error) throw v2Error;
        return v2Data;
    }
    
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
