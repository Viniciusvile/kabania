import { supabase } from '../supabaseClient';
import { safeQuery } from '../utils/supabaseSafe';

// ───────────────────────── PROJECTS ─────────────────────────
export async function listProjects(companyId) {
  if (!companyId) return [];
  const { data, error } = await safeQuery(() =>
    supabase
      .from('pm_projects')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })
  );
  if (error) {
    console.error('[projectsService] listProjects', error);
    return [];
  }
  return data || [];
}

export async function createProject({ companyId, currentUser, name, description, start_date, end_date, color }) {
  const payload = {
    company_id: companyId,
    name,
    description: description || null,
    start_date,
    end_date,
    color: color || '#04D94F',
    status: 'active',
    created_by: currentUser
  };
  const { data, error } = await safeQuery(() =>
    supabase.from('pm_projects').insert([payload]).select().single()
  );
  if (error) throw error;
  return data;
}

export async function updateProject(id, patch) {
  const { data, error } = await safeQuery(() =>
    supabase.from('pm_projects').update(patch).eq('id', id).select().single()
  );
  if (error) throw error;
  return data;
}

export async function deleteProject(id) {
  const { error } = await safeQuery(() =>
    supabase.from('pm_projects').delete().eq('id', id)
  );
  if (error) throw error;
}

// ───────────────────────── PHASES ─────────────────────────
export async function listPhases(projectId) {
  if (!projectId) return [];
  const { data, error } = await safeQuery(() =>
    supabase
      .from('pm_phases')
      .select('*')
      .eq('project_id', projectId)
      .order('order_index', { ascending: true })
  );
  if (error) {
    console.error('[projectsService] listPhases', error);
    return [];
  }
  return data || [];
}

export async function createPhase({ projectId, companyId, name, order_index, color }) {
  const { data, error } = await safeQuery(() =>
    supabase
      .from('pm_phases')
      .insert([{ project_id: projectId, company_id: companyId, name, order_index: order_index ?? 0, color: color || null }])
      .select()
      .single()
  );
  if (error) throw error;
  return data;
}

export async function updatePhase(id, patch) {
  const { data, error } = await safeQuery(() =>
    supabase.from('pm_phases').update(patch).eq('id', id).select().single()
  );
  if (error) throw error;
  return data;
}

export async function deletePhase(id) {
  const { error } = await safeQuery(() =>
    supabase.from('pm_phases').delete().eq('id', id)
  );
  if (error) throw error;
}

// ───────────────────────── TASKS ─────────────────────────
export async function listTasks(projectId) {
  if (!projectId) return [];
  const { data, error } = await safeQuery(() =>
    supabase
      .from('pm_tasks')
      .select('*')
      .eq('project_id', projectId)
      .order('order_index', { ascending: true })
  );
  if (error) {
    console.error('[projectsService] listTasks', error);
    return [];
  }
  return data || [];
}

export async function createTask(payload) {
  const { data, error } = await safeQuery(() =>
    supabase.from('pm_tasks').insert([payload]).select().single()
  );
  if (error) throw error;
  return data;
}

export async function updateTask(id, patch) {
  const { data, error } = await safeQuery(() =>
    supabase.from('pm_tasks').update(patch).eq('id', id).select().single()
  );
  if (error) throw error;
  return data;
}

export async function deleteTask(id) {
  const { error } = await safeQuery(() =>
    supabase.from('pm_tasks').delete().eq('id', id)
  );
  if (error) throw error;
}

// ───────────────────────── HELPERS ─────────────────────────
export function computeProjectProgress(tasks) {
  if (!tasks || tasks.length === 0) return 0;
  const done = tasks.filter(t => t.status === 'completed').length;
  return Math.round((done / tasks.length) * 100);
}

export function computeProjectHealth(project, tasks) {
  if (!project?.end_date) return 'on_track';
  const today = new Date();
  const end = new Date(project.end_date);
  const progress = computeProjectProgress(tasks);
  const totalDays = Math.max(1, (end - new Date(project.start_date)) / (1000 * 60 * 60 * 24));
  const elapsed = Math.max(0, (today - new Date(project.start_date)) / (1000 * 60 * 60 * 24));
  const expected = Math.min(100, (elapsed / totalDays) * 100);

  if (today > end && progress < 100) return 'late';
  if (progress + 15 < expected) return 'at_risk';
  return 'on_track';
}
