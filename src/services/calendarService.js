/**
 * Service for interacting with Google Calendar API
 */

const CALENDAR_API_URL = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';

export const syncActivityToCalendar = async (activity, accessToken) => {
  if (!accessToken) throw new Error('Access token is required');

  // Prepare dates
  // Assuming activity.lastAppointment is 'YYYY-MM-DD' and form has visitTime 'HH:mm'
  // If lastAppointment is already a full string or we need to combine them:
  const startDate = new Date(activity.lastAppointment || new Date());
  
  // Default duration 60 mins if not specified
  const duration = parseInt(activity.duration) || 60;
  const endDate = new Date(startDate.getTime() + duration * 60000);

  const event = {
    summary: `[Kabania] ${activity.location} - ${activity.type}`,
    location: activity.address || '',
    description: `
      Tipo: ${activity.type}
      Descrição: ${activity.description || 'Sem descrição'}
      Observação: ${activity.observation || ''}
      Link: ${window.location.origin}
    `.trim(),
    start: {
      dateTime: startDate.toISOString(),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
    end: {
      dateTime: endDate.toISOString(),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'popup', minutes: 30 },
      ],
    },
  };

  const method = activity.google_event_id ? 'PUT' : 'POST';
  const url = activity.google_event_id 
    ? `${CALENDAR_API_URL}/${activity.google_event_id}` 
    : CALENDAR_API_URL;

  const response = await fetch(url, {
    method,
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(event),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Erro ao sincronizar com Google Agenda');
  }

  return await response.json();
};

export const deleteCalendarEvent = async (eventId, accessToken) => {
  if (!accessToken || !eventId) return;

  const response = await fetch(`${CALENDAR_API_URL}/${eventId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });

  if (!response.ok && response.status !== 404) {
    const error = await response.json();
    console.warn('Erro ao deletar evento do calendário:', error.error?.message);
  }
};
