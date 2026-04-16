import { useState, useEffect, useCallback, useRef } from 'react';
import { getWorkEnvironments, getActivities, getEmployeeProfiles, getCollaborators } from '../services/shiftService';
import { supabase } from '../supabaseClient';

export function useShifts(companyId) {
  const cacheKey = `kabania_shifts_cache_${companyId}`;
  
  // SAFE PARSE HELPER
  const safeParse = (key, fallback) => {
    try {
      const saved = localStorage.getItem(key);
      if (!saved || saved === 'undefined') return fallback;
      return JSON.parse(saved);
    } catch (e) {
      console.warn(`[useShifts] Falha ao ler cache ${key}:`, e);
      return fallback;
    }
  };

  // INITIAL STATE FROM CACHE (Obsidian Optimistic UI)
  const cachedShifts = safeParse(`${cacheKey}_shifts`, []);
  const [stats, setStats] = useState(() => safeParse(`${cacheKey}_stats`, { total: 0, open: 0, inProgress: 0, concluded: '0/0' }));
  const [shifts, setShifts] = useState(cachedShifts);
  const [employees, setEmployees] = useState(() => safeParse(`${cacheKey}_employees`, []));
  const [environments, setEnvironments] = useState([]);
  const [activities, setActivities] = useState([]);
  const [pendingActivities, setPendingActivities] = useState(() => safeParse(`${cacheKey}_pending`, []));
  
  // INSTANT HYDRATION: loading é SEMPRE false — o grid nunca fica bloqueado
  // O sync acontece em background, sem overlay.
  const hasCacheRef = useRef(cachedShifts.length > 0);
  const [loading] = useState(false);  // NUNCA bloqueia a UI
  const isInitialLoad = useRef(true);
  
  const [weekStart, setWeekStart] = useState(() => {
    const d = new Date();
    const day = d.getDay() || 7;
    d.setHours(-24 * (day - 1), 0, 0, 0);
    return d;
  });


  const loadAllData = useCallback(async () => {
    // SEVERE FIX: Se o companyId sumiu momentaneamente mas temos cache, 
    // NÃO executamos o fetch e mantemos os dados do cache na tela.
    if (!companyId || isRefreshingRef.current) return;
    try {
      isRefreshingRef.current = true;
      
      // CRITICAL: Nunca bloqueia a UI — sync é silencioso em background
      
      const end = new Date(weekStart);
      end.setDate(weekStart.getDate() + 7);

      // ═══════════════════════════════════════════════════════════════
      // ESTRATÉGIA "DIRECT-FIRST" — ZERO RPC, ZERO RETRY CHAIN
      // Busca TUDO em paralelo diretamente das tabelas REST.
      // Isso elimina o gargalo de 30+ segundos que ocorria quando os 
      // RPCs v3/v2 falhavam com 5 retries de backoff exponencial.
      // ═══════════════════════════════════════════════════════════════
      
      const [shiftsResult, envsResult, actsResult, empResult, collabResult, srResult, activitiesResult] = await Promise.all([
        supabase.from('shifts').select('*').eq('company_id', companyId)
          .gte('start_time', weekStart.toISOString()).lte('start_time', end.toISOString())
          .order('start_time').then(r => r.data || []).catch(() => []),
        getWorkEnvironments(companyId).catch(() => []),
        getActivities(companyId).catch(() => []),
        getEmployeeProfiles(companyId).catch(() => []),
        getCollaborators(companyId).catch(() => []),
        supabase.from('service_requests').select('*').eq('company_id', companyId)
          .then(r => r.data || []).catch(() => []),
        supabase.from('activities').select('id, location, type, status, created, company_id').eq('company_id', companyId)
          .then(r => r.data || []).catch(() => [])
      ]);

      const directEnvs = envsResult || [];
      const directActs = actsResult || [];
      const directEmployees = [...(empResult || []), ...(collabResult || [])];
      const serviceRequests = srResult || [];
      const actualActivities = activitiesResult || [];

      // Mapear shifts com dados de ambiente/atividade por ID
      const envMap = Object.fromEntries(directEnvs.map(e => [e.id, e]));
      const actMap = Object.fromEntries(directActs.map(a => [a.id, a]));
      const srMap = Object.fromEntries(serviceRequests.map(sr => [String(sr.id), sr]));
      const actualActMap = Object.fromEntries(actualActivities.map(aa => [String(aa.id), aa]));

      // Buscar assignments para os shifts carregados (1 query extra, mas rápida)
      const shiftIds = shiftsResult.map(s => s.id);
      let assignmentsMap = {};
      if (shiftIds.length > 0) {
        try {
          const { data: assignments } = await supabase
            .from('shift_assignments')
            .select('*')
            .in('shift_id', shiftIds);
          
          if (assignments) {
            for (const a of assignments) {
              if (!assignmentsMap[a.shift_id]) assignmentsMap[a.shift_id] = [];
              const emp = directEmployees.find(e => 
                (e.shift_profile_id || e.id) === a.employee_id || 
                (e.shift_profile_id || e.id) === a.collaborator_id
              );
              assignmentsMap[a.shift_id].push({
                ...a,
                assignment_id: a.id,
                assignment_status: a.status,
                name: emp?.name || 'Colaborador',
                avatar_url: emp?.avatar_url || null,
                skills: emp?.skills || []
              });
            }
          }
        } catch (assignErr) {
          console.warn('[useShifts] Erro ao buscar assignments:', assignErr?.message);
        }
      }

      const transformedShifts = shiftsResult.map(shift => {
        const env = envMap[shift.environment_id];
        const act = actMap[shift.activity_id];
        const sr = srMap[String(shift.service_request_id)] || actualActMap[String(shift.service_request_id)];
        return {
          ...shift,
          work_environments: { 
            name: env?.name || (sr ? (sr.customer_name || sr.location || 'Local') : 'Local Não Definido')
          },
          work_activities: { 
            name: act?.name || sr?.service_type || sr?.type || 'Atividade',
            required_role: act?.required_role || shift.required_role,
            required_skills: act?.required_skills || shift.required_skills || []
          },
          intelligence_metadata: shift.intelligence_metadata || {},
          assigned_employees: assignmentsMap[shift.id] || [],
          calls_count: shift.calls_count || 0,
          open_calls_count: shift.open_calls_count || 0
        };
      });

      setShifts(transformedShifts);
      setEnvironments(directEnvs);
      setActivities(directActs);

      // Stats
      const total = transformedShifts.length;
      const computedStats = {
        total,
        open: transformedShifts.filter(s => s.status === 'draft' || s.status === 'published').length,
        inProgress: transformedShifts.filter(s => s.status === 'confirmed' || s.status === 'in_progress').length,
        concluded: `${transformedShifts.filter(s => s.status === 'completed' || s.status === 'concluded' || s.status === 'closed').length}/${total}`
      };
      setStats(computedStats);

      // Employees
      const transformedEmployees = directEmployees.map(e => ({
        ...e,
        shift_profile_id: e.shift_profile_id || e.id,
        profile_id: e.profile_id || e.id,
        role: e.role || 'Não definido',
        is_external: e.is_external ?? (e.role === 'field' || !e.id?.toString().includes('ep_')),
        skills: e.skills || []
      }));
      setEmployees(transformedEmployees);

      // Pending Activities (UNIFIED: Service Requests + Actual Activities)
      const linkedSrIds = new Set(transformedShifts.map(s => String(s.service_request_id)).filter(Boolean));
      
      const pendingSRs = serviceRequests
        .filter(sr => {
          const status = (sr.status || '').toLowerCase();
          const isCompleted = status.includes('conclu') || status.includes('finalized') || status.includes('accept');
          return !isCompleted && !linkedSrIds.has(String(sr.id));
        })
        .map(sr => ({
          ...sr,
          location: sr.customer_name + (sr.client_unit ? ' (' + sr.client_unit + ')' : ''),
          type: sr.service_type,
          created: sr.created_at,
          source: 'service_request'
        }));

      const pendingActual = actualActivities
        .filter(aa => {
          const status = (aa.status || '').toLowerCase();
          const isCompleted = status.includes('conclu') || status.includes('finalized');
          return !isCompleted && !linkedSrIds.has(String(aa.id));
        })
        .map(aa => ({
          ...aa,
          location: aa.location || 'Atividade Direta',
          type: aa.type || 'Serviço',
          created: aa.created || aa.created_at,
          source: 'activity'
        }));

      const unifiedPending = [...pendingSRs, ...pendingActual]
        .filter(a => a.id) // Ensure valid ID
        .sort((a, b) => {
          const dateA = new Date(a.created || 0);
          const dateB = new Date(b.created || 0);
          return dateB - dateA;
        });

      // console.log('DEBUG: Unified Pending Count:', unifiedPending.length);
      setPendingActivities(unifiedPending);

      // Salvar cache para Instant Hydration
      localStorage.setItem(`${cacheKey}_stats`, JSON.stringify(computedStats));
      localStorage.setItem(`${cacheKey}_shifts`, JSON.stringify(transformedShifts));
      localStorage.setItem(`${cacheKey}_employees`, JSON.stringify(transformedEmployees));
      localStorage.setItem(`${cacheKey}_pending`, JSON.stringify(unifiedPending));
      hasCacheRef.current = true;
      



    } catch (err) {
      console.error('Error in useShifts:', err);
    } finally {
      isRefreshingRef.current = false;
      isInitialLoad.current = false;
    }
  }, [companyId, weekStart]);

  const isRefreshingRef = useRef(false);
  const refreshTimerRef = useRef(null);

  useEffect(() => {
    if (!companyId) return;

    const debounceLoad = () => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = setTimeout(() => {
        loadAllData();
      }, 400); 
    };

    const applyRealtimeUpdate = (payload) => {
      // 🚀 KANBAN-STYLE PARTIAL UPDATE
      if (payload.eventType === 'UPDATE') {
        const updatedRaw = payload.new;
        setShifts(prev => prev.map(s => {
          if (s.id !== updatedRaw.id) return s;
          return {
            ...s,
            ...updatedRaw,
            work_environments: s.work_environments,
            work_activities: s.work_activities,
            assigned_employees: s.assigned_employees
          };
        }));
      } else {
        debounceLoad();
      }
    };

    const initialTimer = setTimeout(() => {
      loadAllData();
    }, 100);

    const channelName = `realtime-escalas-${companyId}`;
    const shiftsChannel = supabase.channel(channelName)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shifts', filter: `company_id=eq.${companyId}` }, (p) => applyRealtimeUpdate(p))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shift_assignments' }, () => debounceLoad())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'service_requests', filter: `company_id=eq.${companyId}` }, () => debounceLoad())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'activities', filter: `company_id=eq.${companyId}` }, () => debounceLoad())
      .subscribe();

    return () => {
      clearTimeout(initialTimer);
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
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
    addShiftLocally: (newShifts) => {
        const shiftsArray = Array.isArray(newShifts) ? newShifts : [newShifts];
        
        setShifts(prev => {
            const transformed = shiftsArray.map(s => {
                const env = environments.find(e => e.id === s.environment_id);
                const activity = activities.find(a => a.id === s.activity_id);
                
                return {
                    ...s,
                    work_environments: env ? { name: env.name } : s.work_environments,
                    work_activities: activity ? { name: activity.name } : s.work_activities,
                    assigned_employees: s.assigned_employees || []
                };
            });
            
            const updated = [...prev, ...transformed];
            localStorage.setItem(`${cacheKey}_shifts`, JSON.stringify(updated));
            return updated;
        });
    },
    updateShiftLocally: (shiftId, updates) => {
        setShifts(prev => {
            const updated = prev.map(s => s.id === shiftId ? { ...s, ...updates } : s);
            localStorage.setItem(`${cacheKey}_shifts`, JSON.stringify(updated));
            return updated;
        });
    },
    removeShiftLocally: (shiftId) => {
        setShifts(prev => {
            const updated = prev.filter(s => s.id !== shiftId);
            localStorage.setItem(`${cacheKey}_shifts`, JSON.stringify(updated));
            return updated;
        });
    },
    removePendingLocally: (activityId) => {
        setPendingActivities(prev => {
            const updated = prev.filter(a => String(a.id) !== String(activityId));
            localStorage.setItem(`${cacheKey}_pending`, JSON.stringify(updated));
            return updated;
        });
    },
    addPendingLocally: (activity) => {
        setPendingActivities(prev => {
            // Evitar duplicidade caso o realtime já tenha adicionado
            if (prev.find(a => String(a.id) === String(activity.id))) return prev;
            const updated = [activity, ...prev];
            localStorage.setItem(`${cacheKey}_pending`, JSON.stringify(updated));
            return updated;
        });
    }
  };
}
