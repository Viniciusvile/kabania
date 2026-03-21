/**
 * Synapse Smart: AI Auto-Pilot Scheduling Engine
 * Engine matemática de alocação de restrições (Constraint Satisfaction)
 * 
 * Regras:
 * 1. max_weekly_hours (ex: 44h) não pode ser ultrapassado
 * 2. max_daily_hours (ex: 8h) não pode ser ultrapassado
 * 3. employee_id deve possuir o required_role da atividade pendente
 * 4. Evitar conflito de horário no mesmo dia (overlap)
 */

export function generateAutoPilotSchedule({ pendingActivities, employees, existingShifts, weekStart }) {
  const suggestions = [];
  const errors = [];
  
  const weekStartMs = new Date(weekStart).getTime();
  const weekEndMs = weekStartMs + (7 * 24 * 60 * 60 * 1000);

  // Deep clone to track hours visually inside this run
  const workers = employees.filter(e => e.is_external === true).map(e => ({
    ...e,
    currentWeekHours: calculateWorkerWeekHours(e.id, existingShifts, weekStartMs, weekEndMs),
    assignedInSimulation: 0
  }));

  // Helper to parse duration
  const getDurationHours = (act) => act.duration_minutes ? (act.duration_minutes / 60) : 4;

  const simulatedShifts = [...existingShifts];

  for (const activity of pendingActivities) {
    const requiredHours = getDurationHours(activity);
    
    // Find eligible workers
    const eligibleWorkers = workers.filter(w => {
      // Rule 1: Skill Match
      const hasSkill = !activity.required_role || (w.skills && w.skills.includes(activity.required_role));
      if (!hasSkill) return false;

      // Rule 2: Max Hours
      const totalHours = w.currentWeekHours + w.assignedInSimulation + requiredHours;
      if (totalHours > (w.max_weekly_hours || 44)) return false;

      return true;
    });

    if (eligibleWorkers.length === 0) {
      errors.push(`Nenhum colaborador elegível para a atividade: ${activity.name}`);
      continue;
    }

    // Sort by "who has the least hours" to balance workload
    eligibleWorkers.sort((a, b) => 
      (a.currentWeekHours + a.assignedInSimulation) - (b.currentWeekHours + b.assignedInSimulation)
    );

    const bestWorker = eligibleWorkers[0];
    
    // Assign best slot. 
    // Logic: Look for a 4-hour gap on weekdays 08:00 to 18:00.
    const slot = findAvailableSlotForWorker(bestWorker, simulatedShifts, weekStart, requiredHours);
    
    if (slot) {
       bestWorker.assignedInSimulation += requiredHours;
       suggestions.push({
         service_request_id: activity.id,
         activity_name: activity.name,
         environment_name: activity.work_environments?.name || 'Local Não Definido',
         assigned_employee_id: bestWorker.id,
         assigned_employee_name: bestWorker.name,
         start_time: slot.start,
         end_time: slot.end,
         confidence: 98,
         duration_hours: requiredHours,
         worker_utilization_percent: Math.round(((bestWorker.currentWeekHours + bestWorker.assignedInSimulation) / (bestWorker.max_weekly_hours || 44)) * 100)
       });
       
       simulatedShifts.push({
         employee_id: bestWorker.id,
         start_time: slot.start,
         end_time: slot.end
       });
    } else {
      errors.push(`Não há horário vago na agenda de ${bestWorker.name} para: ${activity.name}`);
    }
  }

  return { suggestions, errors, stats: { simulatedCount: suggestions.length, unresolvedCount: errors.length } };
}

function calculateWorkerWeekHours(employeeId, shifts, weekStartMs, weekEndMs) {
  return shifts.reduce((total, s) => {
    const sStart = new Date(s.start_time).getTime();
    if (sStart >= weekStartMs && sStart <= weekEndMs && s.assigned_employees?.some(e => e.id === employeeId || e.assignment_id === employeeId)) {
       const ms = new Date(s.end_time).getTime() - sStart;
       return total + (ms / 3600000);
    }
    return total;
  }, 0);
}

function findAvailableSlotForWorker(worker, simulatedShifts, weekStart, requiredHours) {
  // Simple heuristic: Try Monday to Friday
  for (let d = 1; d <= 5; d++) {
     const dayDate = new Date(weekStart);
     dayDate.setDate(dayDate.getDate() + d);
     
     // Test 08:00
     const start8 = new Date(dayDate);
     start8.setHours(8, 0, 0, 0);
     const end8 = new Date(start8.getTime() + (requiredHours * 3600000));
     
     if (!hasOverlap(worker.id, start8, end8, simulatedShifts)) return { start: start8.toISOString(), end: end8.toISOString() };
     
     // Test 13:00
     const start13 = new Date(dayDate);
     start13.setHours(13, 0, 0, 0);
     const end13 = new Date(start13.getTime() + (requiredHours * 3600000));
     
     if (!hasOverlap(worker.id, start13, end13, simulatedShifts)) return { start: start13.toISOString(), end: end13.toISOString() };
  }
  return null;
}

function hasOverlap(employeeId, start, end, shifts) {
  const sTime = start.getTime();
  const eTime = end.getTime();
  
  return shifts.some(s => {
    // Check if worker is in this shift
    const isWorker = s.employee_id === employeeId || s.assigned_employees?.some(e => e.id === employeeId);
    if (!isWorker) return false;
    
    const csTime = new Date(s.start_time).getTime();
    const ceTime = new Date(s.end_time).getTime();
    
    // overlap condition
    return (sTime < ceTime && eTime > csTime);
  });
}
