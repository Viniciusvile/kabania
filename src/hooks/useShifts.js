import { useState, useEffect, useCallback, useRef } from 'react';
import { getShiftsDashboardData, createShift, getShifts } from '../services/shiftService';
import { supabase } from '../supabaseClient';
import { safeQuery } from '../utils/supabaseSafe';

export function useShifts(companyId) {
  const cacheKey = `kabania_shifts_cache_${companyId}`;
  
  // INITIAL STATE FROM CACHE (Obsidian Optimistic UI)
  const [stats, setStats] = useState(() => {
    const saved = localStorage.getItem(`${cacheKey}_stats`);
    return saved ? JSON.parse(saved) : { total: 0, open: 0, inProgress: 0, concluded: '0/0' };
  });
  const [shifts, setShifts] = useState(() => {
    const saved = localStorage.getItem(`${cacheKey}_shifts`);
    return saved ? JSON.parse(saved) : [];
  });
  const [employees, setEmployees] = useState(() => {
    const saved = localStorage.getItem(`${cacheKey}_employees`);
    return saved ? JSON.parse(saved) : [];
  });
  const [environments, setEnvironments] = useState([]);
  const [activities, setActivities] = useState([]);
  const [pendingActivities, setPendingActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [weekStart, setWeekStart] = useState(() => {
    const d = new Date();
    const day = d.getDay() || 7;
    d.setHours(-24 * (day - 1), 0, 0, 0);
    return d;
  });


  const loadAllData = useCallback(async () => {
    if (!companyId || isRefreshingRef.current) return;
    try {
      isRefreshingRef.current = true;
      setLoading(true);
      
      const end = new Date(weekStart);
      end.setDate(weekStart.getDate() + 7);

      // SINGLE TURBO REQUEST with Safe Fetcher
      let data;
      try {
        const response = await safeQuery(() => 
          getShiftsDashboardData(companyId, weekStart.toISOString(), end.toISOString())
        );
        data = response;
      } catch (rpcErr) {
        console.error("Erro fatal no Turbo Loader:", rpcErr);
        return;
      }
      
      if (!data) {
        console.warn("Nenhum dado retornado pelo Turbo Loader (possível timeout ou conflito de lock persistente).");
        return;
      }
      
// ... (rest of the mapping code)

      // Update Stats
      setStats(data.stats);
      
      // Transform shifts for component compatibility
      const transformedShifts = (data.shifts || []).map(shift => ({
          ...shift,
          work_environments: { 
              name: shift.environment_name || 
                    (shift.service_customer ? `${shift.service_customer}${shift.service_unit ? ' (' + shift.service_unit + ')' : ''}` : null) ||
                    (() => {
                        const sr = (data.service_requests || []).find(r => String(r.id) === String(shift.service_request_id));
                        return sr ? (sr.customer_name + (sr.client_unit ? ` (${sr.client_unit})` : '')) : 'Local Não Definido';
                    })()
          },
          work_activities: { 
              name: shift.activity_name || shift.service_type || (() => {
                  const sr = (data.service_requests || []).find(r => String(r.id) === String(shift.service_request_id));
                  return sr ? sr.service_type : 'Atividade';
              })(),
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
      setShifts(transformedShifts);

      // Transform employees
      const transformedEmployees = (data.employees || []).map(e => ({
          ...e,
          shift_profile_id: e.shift_profile_id || e.id,
          profile_id: e.profile_id || e.id,
          role: e.role || 'Não definido',
          is_external: e.is_external ?? (e.role === 'field' || !e.id?.includes('ep_')),
          skills: e.skills || []
      }));
      setEmployees(transformedEmployees);

      setEnvironments(data.environments || []);
      setActivities(data.activities || []);
      
      // Merge Pending Activities and Service Requests
      const rawActivities = [
        ...(data.raw_activities || []).map(act => ({
          ...act,
          location: act.name || 'Atividade Geral',
          type: 'Rotina',
          created: act.created_at
        })),
        ...(data.service_requests || []).map(sr => ({
          ...sr,
          location: sr.customer_name + (sr.client_unit ? ' (' + sr.client_unit + ')' : ''),
          type: sr.service_type,
          created: sr.created_at
        }))
      ];

      const linkedIds = new Set(transformedShifts.map(s => String(s.service_request_id)).filter(Boolean));
      const pending = rawActivities.filter(a => {
        const status = (a.status || '').toLowerCase();
        const isCompleted = status.includes('conclu') || status.includes('finalized');
        return !isCompleted && !linkedIds.has(String(a.id));
      }).sort((a, b) => new Date(b.created) - new Date(a.created));

      setPendingActivities(pending);

      // Update local cache for Optimistic UI (following Obsidian guidelines)
      localStorage.setItem(`${cacheKey}_stats`, JSON.stringify(data.stats));
      localStorage.setItem(`${cacheKey}_shifts`, JSON.stringify(transformedShifts));
      localStorage.setItem(`${cacheKey}_employees`, JSON.stringify(transformedEmployees));

    } catch (err) {
      console.error('Error in useShifts:', err);
    } finally {
      setLoading(false);
      isRefreshingRef.current = false;
    }
  }, [companyId, weekStart]);

  const isRefreshingRef = useRef(false);

  useEffect(() => {
    // STAGGERED LOAD: Wait for App.jsx auth/session to stabilize
    const timer = setTimeout(() => {
      loadAllData();
    }, 1500);

    const channelName = `realtime-escalas-${companyId}`;
    const shiftsChannel = supabase.channel(channelName)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shifts', filter: `company_id=eq.${companyId}` }, () => loadAllData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shift_assignments' }, () => loadAllData())
      .subscribe();

    return () => {
      clearTimeout(timer);
      supabase.removeChannel(shiftsChannel);
    };
  }, [companyId, weekStart, loadAllData]);

  return {
    stats,
    shifts,
    employees,
    environments,
    activities,
    pendingActivities,
    loading,
    weekStart,
    setWeekStart,
    refresh: loadAllData,
    updateShiftLocally: (shiftId, updates) => {
        setShifts(prev => prev.map(s => s.id === shiftId ? { ...s, ...updates } : s));
    }
  };
}
