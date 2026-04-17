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
  
  // PEGADA SEGURA: Buscamos primeiro os perfis de funcionarios
  const { data: epData, error: epError } = await supabase
    .from('employee_profiles')
    .select('*')
    .eq('company_id', companyId);
  
  if (epError) {
    console.error('[getEmployeeProfiles] ❌ Erro ao buscar perfis:', epError);
    return [];
  }

  if (!epData || epData.length === 0) return [];

  // Buscamos os perfis base (profiles) correspondentes para evitar o JOIN implícito que falha com 400
  const profileIds = epData.map(ep => ep.profile_id).filter(id => id);
  
  let profilesMap = {};
  if (profileIds.length > 0) {
    const { data: pData } = await supabase
      .from('profiles')
      .select('id, name, email, avatar_url')
      .in('id', profileIds);
    
    if (pData) {
      profilesMap = Object.fromEntries(pData.map(p => [p.id, p]));
    }
  }

  return epData.map(sData => {
    const profile = profilesMap[sData.profile_id] || {};
    return {
      ...profile,
      ...sData,
      shift_profile_id: sData.id,
      role: sData.role || 'Não definido',
      max_daily_hours: sData.max_daily_hours || 8,
      max_weekly_hours: sData.max_weekly_hours || 44,
      availability_schedule: sData.availability_schedule || {},
      skills: sData.skills || [],
      performance_notes: sData.performance_notes || ''
    };
  });
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
    
    // PEGADA SEGURA: Buscamos as escalas da tabela base para evitar erros de view/join
    let query = supabase
        .from('shifts')
        .select(`
            *,
            shift_assignments ( 
                id, 
                status, 
                employee_id
            )
        `)
        .eq('company_id', companyId)
        .order('start_time');

    if (startDate) query = query.gte('start_time', startDate);
    if (endDate) query = query.lte('end_time', endDate);

    const { data: qData, error: qError } = await query;
    if (qError) {
        console.error('[getShifts] ❌ Erro ao buscar escalas:', qError);
        return [];
    }
    
    if (!qData) return [];

    // NOTA: Para performance e evitar erro 400 de join sem FK,
    // os detalhes dos funcionários (nomes, etc) são carregados via getEmployeeProfiles
    // e mapeados no componente ou hook useShifts.
    return qData.map(shift => ({
        ...shift,
        assigned_employees: shift.shift_assignments?.map(a => ({
            id: a.employee_id,
            assignment_id: a.id,
            assignment_status: a.status
        })) || []
    }));
};

export const createShift = async (shiftData, userId) => {
    try {
        const { data, error } = await supabase
            .from('shifts')
            .insert([shiftData])
            .select()
            .single();
        
        if (error) {
            // FALLBACK: Se o banco reclamar de 'id' (erro 42703), tentamos insert minimalista sem select retorno
            if (error.code === '42703' && error.message.includes('id')) {
                console.warn('[shiftService] ⚠️ Coluna id ausente no retorno de Shifts, tentando insert simplificado...');
                const { error: insError } = await supabase.from('shifts').insert([shiftData]);
                if (insError) throw insError;
                
                // Tenta recuperar para manter consistência na UI
                const { data: fetchBack } = await supabase
                    .from('shifts')
                    .select('*')
                    .eq('company_id', shiftData.company_id)
                    .eq('start_time', shiftData.start_time)
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .single();
                
                return fetchBack;
            }
            throw error;
        }

        logEvent(shiftData.company_id, userId, 'SHIFT_CREATED', `Escala criada para o ambiente ${shiftData.environment_id}`);
        return data;
    } catch (err) {
        console.error('[createShift] ❌ Erro ao criar escala:', err);
        throw err;
    }
};

export const updateShiftStatus = async (shiftId, status) => {
    return await safeQuery(
        () => supabase.from('shifts').update({ status }).eq('id', shiftId).select().single(),
        `Atualizando status da escala ${shiftId} para ${status}`
    );
};

export const updateShift = async (shiftId, updateData, userId) => {
    try {
        const { data, error } = await supabase
            .from('shifts')
            .update(updateData)
            .eq('id', shiftId)
            .select()
            .single();

        if (error) throw error;

        logEvent(updateData.company_id, userId, 'SHIFT_UPDATED', `Escala ${shiftId} personalizada`);
        return data;
    } catch (err) {
        console.error('[updateShift] ❌ Erro ao atualizar escala:', err);
        throw err;
    }
};

export const deleteShift = async (shiftId, companyId = null) => {
    try {
        // 1. Limpar atribuições primeiro para evitar erro de FK (Foreign Key)
        await supabase.from('shift_assignments').delete().eq('shift_id', shiftId);

        // 2. Deletar a escala
        return await safeQuery(
            () => {
                let query = supabase.from('shifts').delete().eq('id', shiftId);
                if (companyId) query = query.eq('company_id', companyId);
                return query;
            },
            `Deletando escala ${shiftId}`
        );
    } catch (err) {
        console.error('[deleteShift] Erro ao deletar escala e vínculos:', err);
        throw err;
    }
};

export const moveShift = async (shiftId, startTime, endTime, environmentId = null, companyId = null) => {
    // 0. Limpeza de ID para evitar erros de cast
    const cleanShiftId = shiftId;
    const cleanEnvId = environmentId === "" ? null : environmentId;

    // 1. Tentar via RPC (SECURITY DEFINER - bypassa RLS do PostgREST)
    try {
        const { data: rpcData, error: rpcError } = await supabase.rpc('move_shift_rpc', {
            p_shift_id: cleanShiftId,
            p_start_time: startTime,
            p_end_time: endTime,
            p_environment_id: cleanEnvId
        });

        if (!rpcError && rpcData?.success) {
            console.log('[moveShift] ✅ RPC bem-sucedida:', cleanShiftId);
            return { id: cleanShiftId, start_time: startTime, end_time: endTime, environment_id: cleanEnvId };
        }

        if (rpcError) {
            console.warn('[moveShift] ⚠️ Falha na RPC, tentando update direto:', rpcError.message);
        }
    } catch (rpcFatal) {
        console.error('[moveShift] 🚨 Erro fatal na RPC:', rpcFatal);
    }

    // 2. Fallback: UPDATE direto (PostgREST)
    console.log('[moveShift] 🔄 Tentando UPDATE direto para:', cleanShiftId);
    
    const updatePayload = { 
        start_time: startTime, 
        end_time: endTime, 
        updated_at: new Date().toISOString() 
    }
    if (cleanEnvId) updatePayload.environment_id = cleanEnvId;

    let query = supabase.from('shifts').update(updatePayload).eq('id', cleanShiftId);
    
    // CRITICAL: Alinhamento com Obsidian (Segurança Multi-Tenant)
    if (companyId) query = query.eq('company_id', companyId);

    const { data: updatedRows, error: updateError } = await query.select('id');

    if (updateError) {
        console.error('[moveShift] ❌ Erro no UPDATE direto:', updateError);
        throw new Error(updateError.message || 'Erro ao mover escala no banco.');
    }

    if (!updatedRows || updatedRows.length === 0) {
        throw new Error('Permissão negada ou escala não encontrada para atualização.');
    }

    return { id: cleanShiftId, start_time: startTime, end_time: endTime, environment_id: cleanEnvId };
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

export const replaceEmployeeInShift = async (shiftId, personId, isExternal = false) => {
    // 1. Remove existing assignments for this shift
    const { error: delError } = await supabase
        .from('shift_assignments')
        .delete()
        .eq('shift_id', shiftId);
    
    if (delError) throw delError;

    // 2. Add the new one
    if (personId) {
        return await addEmployeeToShift(shiftId, personId, isExternal);
    }
    return { data: null };
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
