/**
 * Service to manage company-wide activity history (audit log).
 * Stores events in localStorage scoped by companyId.
 */

const STORAGE_KEY_PREFIX = 'synapse_history_';

/**
 * Log a new event to the company history.
 * @param {string} companyId - The ID of the company.
 * @param {string} userEmail - The email of the user who performed the action.
 * @param {string} action - The action type (e.g., 'CREATE_ACTIVITY', 'MEMBER_PROMOTED').
 * @param {string} details - A human-readable description of the event.
 */
export const logEvent = (companyId, userEmail, action, details) => {
  if (!companyId) return;

  const key = `${STORAGE_KEY_PREFIX}${companyId}`;
  const event = {
    id: String(Date.now() + Math.floor(Math.random() * 1000)),
    timestamp: new Date().toISOString(),
    userEmail,
    action,
    details
  };

  try {
    const history = JSON.parse(localStorage.getItem(key) || '[]');
    // Keep last 1000 events to manage storage
    const updatedHistory = [event, ...history].slice(0, 1000);
    localStorage.setItem(key, JSON.stringify(updatedHistory));
  } catch (error) {
    console.error('Error logging event:', error);
  }
};

/**
 * Retrieve the event history for a specific company.
 * @param {string} companyId - The ID of the company.
 * @returns {Array} - Array of event objects.
 */
export const getHistory = (companyId) => {
  if (!companyId) return [];
  try {
    return JSON.parse(localStorage.getItem(`${STORAGE_KEY_PREFIX}${companyId}`) || '[]');
  } catch {
    return [];
  }
};

/**
 * Clear the history for a specific company (Admin only).
 * @param {string} companyId - The ID of the company.
 */
export const clearHistory = (companyId) => {
  if (!companyId) return;
  localStorage.removeItem(`${STORAGE_KEY_PREFIX}${companyId}`);
};
