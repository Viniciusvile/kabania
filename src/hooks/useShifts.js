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
  const [pendingActivities, setPendingActivities] = useState([]);
  
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
      
      const [shiftsResult, envsResult, actsResult, empResult, collabResult, srResult] = await Promise.all([
        supabase.from('shifts').select('*').eq('company_id', companyId)
          .gte('start_time', weekStart.toISOString()).lte('start_time', end.toISOString())
          .order('start_time').then(r => r.data || []).catch(() => []),
        getWorkEnvironments(companyId).catch(() => []),
        getActivities(companyId).catch(() => []),
        getEmployeeProfiles(companyId).catch(() => []),
        getCollaborators(companyId).catch(() => []),
        supabase.from('service_requests').select('*').eq('company_id', companyId)
          .then(r => r.data || []).catch(() => [])
      ]);

      const directEnvs = envsResult || [];
      const directActs = actsResult || [];
      const directEmployees = [...(empResult || []), ...(collabResult || [])];
      const serviceRequests = srResult || [];

      // Mapear shifts com dados de ambiente/atividade por ID
      const envMap = Object.fromEntries(directEnvs.map(e => [e.id, e]));
      const actMap = Object.fromEntries(directActs.map(a => [a.id, a]));
      const srMap = Object.fromEntries(serviceRequests.map(sr => [String(sr.id), sr]));

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
        const sr = srMap[String(shift.service_request_id)];
        return {
          ...shift,
          work_environments: { 
            name: env?.name || (sr ? `${sr.customer_name}${sr.client_unit ? ' (' + sr.client_unit + ')' : ''}` : 'Local Não Definido')
          },
          work_activities: { 
            name: act?.name || sr?.service_type || 'Atividade',
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
        open: transformedShifts.filter(s => s.status === 'open' || s.status === 'scheduled').length,
        inProgress: transformedShifts.filter(s => s.status === 'in_progress' || s.status === 'active').length,
        concluded: `${transformedShifts.filter(s => s.status === 'completed' || s.status === 'concluded').length}/${total}`
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

      // Pending Activities
      const rawActivities = [
        ...directActs.map(act => ({
          ...act,
          location: act.name || 'Atividade Geral',
          type: 'Rotina',
          created: act.created_at
        })),
        ...serviceRequests.map(sr => ({
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

      // Salvar cache para Instant Hydration
      localStorage.setItem(`${cacheKey}_stats`, JSON.stringify(computedStats));
      localStorage.setItem(`${cacheKey}_shifts`, JSON.stringify(transformedShifts));
      localStorage.setItem(`${cacheKey}_employees`, JSON.stringify(transformedEmployees));
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
            // 💾 Sincroniza o cache do localStorage imediatamente para o Refresh não carregar lixo
            localStorage.setItem(`${cacheKey}_shifts`, JSON.stringify(updated));
            return updated;
        });
    }
  };
}
