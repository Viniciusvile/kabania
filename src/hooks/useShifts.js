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
  
  // Instant Load: Se temos cache, não bloqueamos a tela com o overlay central
  const hasCache = shifts.length > 0;
  const [loading, setLoading] = useState(!hasCache);
  const isInitialLoad = useRef(true);
  
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
      
      // Só mostramos o overlay central se for o primeiro carregamento SEM cache
      if (!hasCache && isInitialLoad.current) {
        setLoading(true);
      }
      
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
        console.warn("[useShifts] RPC Turbo falhou, usando fallback direto na tabela:", rpcErr?.message);
        data = null;
      }
      
      // FALLBACK: Se RPCs falharam, buscar shifts diretamente da tabela
      if (!data) {
        console.warn("[useShifts] Ativando fallback direto na tabela shifts...");
        try {
          const { data: rawShifts, error: fallbackErr } = await supabase
            .from('view_shifts_standard')
            .select('*')
            .eq('company_id', companyId)
            .gte('start_time', weekStart.toISOString())
            .lte('end_time', end.toISOString())
            .order('start_time');

          if (fallbackErr || !rawShifts) {
            // Último recurso: buscar direto da tabela shifts
            const { data: directShifts } = await supabase
              .from('shifts')
              .select('*')
              .eq('company_id', companyId)
              .gte('start_time', weekStart.toISOString())
              .order('start_time');

            if (directShifts) {
              const mapped = directShifts.map(s => ({
                ...s,
                work_environments: { name: 'Local' },
                work_activities: { name: 'Atividade' },
                assigned_employees: [],
                calls_count: 0,
                open_calls_count: 0
              }));
              setShifts(mapped);
              localStorage.setItem(`${cacheKey}_shifts`, JSON.stringify(mapped));
              console.log('[useShifts] ✅ Fallback último recurso: shifts atualizados da tabela direta.');
            }
            return;
          }

          const mapped = rawShifts.map(s => ({
            ...s,
            work_environments: { name: s.environment_name || 'Local' },
            work_activities: { name: s.activity_name || 'Atividade', required_role: s.required_role, required_skills: s.required_skills || [] },
            assigned_employees: [],
            calls_count: s.calls_count || 0,
            open_calls_count: s.open_calls_count || 0
          }));
          setShifts(mapped);
          localStorage.setItem(`${cacheKey}_shifts`, JSON.stringify(mapped));
          console.log('[useShifts] ✅ Fallback via view_shifts_standard bem-sucedido.');
        } catch (fbErr) {
          console.error('[useShifts] Todos os fallbacks falharam:', fbErr);
        }
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
          assigned_employees: (shift.assigned_employees || shift.shift_assignments || []).map(a => {
              // V3 ja vem com name/role, V2 vem com employee_profiles.profiles.name
              const profile = a.employee_profiles?.profiles || {};
              return {
                  ...(a.employee_profiles || {}),
                  ...a, // V3 ja tem os campos planos
                  assignment_id: a.assignment_id || a.id,
                  assignment_status: a.assignment_status || a.status,
                  name: a.name || profile.name || 'Colaborador',
                  avatar_url: a.avatar_url || profile.avatar_url || null,
                  skills: a.skills || (a.employee_profiles?.skills || [])
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
      isInitialLoad.current = false;
    }
  }, [companyId, weekStart]);

  const isRefreshingRef = useRef(false);

  useEffect(() => {
    // STAGGERED LOAD: Reduzido de 1500 para 100ms para resposta instantanea
    const timer = setTimeout(() => {
      loadAllData();
    }, 100);

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
