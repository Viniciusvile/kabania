// smartAllocationService.js
// Logic to auto-assign employees to shifts based on rules, availability, and capacity.

import { createNotification } from './notificationService';

/**
 * Generates an automated shift mapping.
 * @param {Array} employees - Array of merged employee profiles.
 * @param {Array} environments - Array of work environments.
 * @param {Array} activities - Array of activities.
 * @param {Date} date - The target day to schedule.
 * @param {Object} companyContext - { companyId, authorId } 
 * @returns {Array} List of draft shifts to be saved in the DB.
 */
export const generateSmartShiftForDay = (employees, environments, activities, date, companyContext) => {
    const drafts = [];
    const dayOfWeek = date.getDay(); // 0 (Sun) to 6 (Sat)
    const dayName = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][dayOfWeek];
    
    // Track hours used per employee to avoid exceeding daily max
    const employeeHoursUsed = {};
    employees.forEach(emp => {
        employeeHoursUsed[emp.id] = 0; // tracking by base profile ID
    });

    // 1. For each environment, we need to fulfill minimum coverage using its activities
    environments.forEach(env => {
        const envActivities = activities.filter(a => a.environment_id === env.id);
        if (envActivities.length === 0) return;

        let coverageCount = 0;
        const requiredCoverage = env.min_coverage || 1;

        // Try to allocate employees until coverage is met
        while (coverageCount < requiredCoverage) {
            // Pick an activity (round robin or random, simplify for now: just pick the first needed)
            const activityToAssign = envActivities[coverageCount % envActivities.length];
            const neededRole = activityToAssign.required_role;
            const durationHrs = activityToAssign.duration_minutes / 60;

            // Find an eligible employee
            const eligibleEmployee = employees.find(emp => {
                if (emp.role !== neededRole && neededRole !== 'Qualquer') return false; // Role mismatch
                if (!emp.shift_profile_id) return false; // Needs the shift profile linked

                // Check availability
                const avail = emp.availability_schedule?.[dayName];
                if (!avail) return false; // Not available this day
                
                // Check if they have hours left
                const currentHours = employeeHoursUsed[emp.id];
                if (currentHours + durationHrs > emp.max_daily_hours) return false;

                // Make sure they are not already booked for this specific exact time block
                // For a truly smart system, we'd need exact start/end logic based on the `avail` array [start, end].
                // Let's assume standard shift 08:00 to 17:00 and segment it.
                // Simplified simulation:
                return true;
            });

            if (eligibleEmployee) {
                // Determine start and end time based on availability and current hours used
                // Simple heuristic: If available "08:00-18:00", block hours iteratively.
                const baseStartHour = 8 + employeeHoursUsed[eligibleEmployee.id]; 
                
                const startTime = new Date(date);
                startTime.setHours(Math.floor(baseStartHour), (baseStartHour % 1) * 60, 0, 0);

                const endTime = new Date(startTime);
                endTime.setMinutes(startTime.getMinutes() + activityToAssign.duration_minutes);

                drafts.push({
                    company_id: companyContext.companyId,
                    environment_id: env.id,
                    activity_id: activityToAssign.id,
                    employee_id: eligibleEmployee.shift_profile_id,
                    start_time: startTime.toISOString(),
                    end_time: endTime.toISOString(),
                    status: 'scheduled',
                    notes: 'Alocação Inteligente'
                });

                employeeHoursUsed[eligibleEmployee.id] += durationHrs;
                coverageCount++;
            } else {
                // Could not find coverage! This will be flagged in the UI.
                console.warn(`Could not fulfill coverage for ${env.name}`);
                break; // stop infinite loops if nobody is available
            }
        }
    });

    return drafts;
};

/**
 * Triggers notifications for all employees who received new shifts.
 */
export const notifyShiftAssignments = async (drafts, employees, companyId) => {
    // Notify distinct employees
    const notifiedIds = new Set();

    for (const draft of drafts) {
        if (!notifiedIds.has(draft.employee_id)) {
            // we need the base profile.id from the shift_profile_id
            const baseEmp = employees.find(e => e.shift_profile_id === draft.employee_id);
            if (baseEmp && baseEmp.id) {
                await createNotification(
                    companyId, 
                    baseEmp.id, 
                    'SHIFT_UPDATE', 
                    'Sua agenda de horários foi atualizada pela gestão inteligente.'
                );
                notifiedIds.add(draft.employee_id);
            }
        }
    }
};
