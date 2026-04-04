import { supabase } from '../supabaseClient';
import { syncActivityToCalendar, deleteCalendarEvent } from './calendarService';
import { logEvent } from './historyService';

export class CalendarIntegrationService {
  constructor(companyId) {
    this.companyId = companyId;
  }

  async getIntegrationConfig() {
    const { data, error } = await supabase
      .from('calendar_integrations')
      .select('*')
      .eq('company_id', this.companyId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Erro ao buscar configuração de calendário:', error);
      return null;
    }
    
    return data || {
      google_calendar_enabled: false,
      google_calendar_access_token: null,
      outlook_enabled: false,
      outlook_access_token: null,
      sync_direction: 'bidirectional',
      sync_interval: 30,
      last_sync: null
    };
  }

  async saveIntegrationConfig(config) {
    const { data, error } = await supabase
      .from('calendar_integrations')
      .upsert({
        ...config,
        company_id: this.companyId,
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Erro ao salvar configuração de calendário:', error);
      throw error;
    }

    logEvent(this.companyId, 'system', 'CALENDAR_CONFIG_UPDATE', 
      `Configuração de calendário atualizada: Google ${config.google_calendar_enabled ? 'ativado' : 'desativado'}, Outlook ${config.outlook_enabled ? 'ativado' : 'desativado'}`);
    
    return data;
  }

  async syncActivityToExternalCalendars(activity, config) {
    const results = [];

    if (config.google_calendar_enabled && config.google_calendar_access_token) {
      try {
        const googleResult = await syncActivityToCalendar(activity, config.google_calendar_access_token);
        results.push({
          provider: 'google',
          success: true,
          eventId: googleResult.id
        });
      } catch (error) {
        console.error('Erro ao sincronizar com Google Calendar:', error);
        results.push({
          provider: 'google',
          success: false,
          error: error.message
        });
      }
    }

    if (config.outlook_enabled && config.outlook_access_token) {
      try {
        const outlookResult = await this.syncToOutlook(activity, config.outlook_access_token);
        results.push({
          provider: 'outlook',
          success: true,
          eventId: outlookResult.id
        });
      } catch (error) {
        console.error('Erro ao sincronizar com Outlook:', error);
        results.push({
          provider: 'outlook',
          success: false,
          error: error.message
        });
      }
    }

    return results;
  }

  async syncToOutlook(activity, accessToken) {
    const startDate = new Date(activity.lastAppointment || new Date());
    const duration = parseInt(activity.duration) || 60;
    const endDate = new Date(startDate.getTime() + duration * 60000);

    const event = {
      subject: `[Kabania] ${activity.location} - ${activity.type}`,
      body: {
        contentType: 'HTML',
        content: `
          <p><strong>Tipo:</strong> ${activity.type}</p>
          <p><strong>Descrição:</strong> ${activity.description || 'Sem descrição'}</p>
          <p><strong>Observação:</strong> ${activity.observation || ''}</p>
          <p><strong>Link:</strong> <a href="${window.location.origin}">Kabania</a></p>
        `
      },
      start: {
        dateTime: startDate.toISOString(),
        timeZone: 'UTC'
      },
      end: {
        dateTime: endDate.toISOString(),
        timeZone: 'UTC'
      },
      location: {
        displayName: activity.address || ''
      },
      reminderMinutesBeforeStart: 30,
      isReminderOn: true
    };

    const url = activity.outlook_event_id 
      ? `https://graph.microsoft.com/v1.0/me/events/${activity.outlook_event_id}`
      : 'https://graph.microsoft.com/v1.0/me/events';

    const method = activity.outlook_event_id ? 'PATCH' : 'POST';

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
      throw new Error(error.error?.message || 'Erro ao sincronizar com Outlook');
    }

    return await response.json();
  }

  async deleteFromExternalCalendars(activity, config) {
    const results = [];

    if (config.google_calendar_enabled && activity.google_event_id && config.google_calendar_access_token) {
      try {
        await deleteCalendarEvent(activity.google_event_id, config.google_calendar_access_token);
        results.push({ provider: 'google', success: true });
      } catch (error) {
        console.error('Erro ao deletar do Google Calendar:', error);
        results.push({ provider: 'google', success: false, error: error.message });
      }
    }

    if (config.outlook_enabled && activity.outlook_event_id && config.outlook_access_token) {
      try {
        await this.deleteFromOutlook(activity.outlook_event_id, config.outlook_access_token);
        results.push({ provider: 'outlook', success: true });
      } catch (error) {
        console.error('Erro ao deletar do Outlook:', error);
        results.push({ provider: 'outlook', success: false, error: error.message });
      }
    }

    return results;
  }

  async deleteFromOutlook(eventId, accessToken) {
    const response = await fetch(`https://graph.microsoft.com/v1.0/me/events/${eventId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!response.ok && response.status !== 404) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Erro ao deletar evento do Outlook');
    }
  }

  async startAutoSync(config) {
    if (!config.sync_interval || config.sync_interval < 5) return;

    setInterval(async () => {
      if (config.google_calendar_enabled || config.outlook_enabled) {
        await this.fullSync(config);
      }
    }, config.sync_interval * 60000);
  }

  async fullSync(config) {
    console.log('Iniciando sincronização completa de calendários...');
    
    const { data: activities } = await supabase
      .from('activities')
      .select('*')
      .eq('company_id', this.companyId)
      .order('lastAppointment', { ascending: true });

    if (!activities) return;

    let successCount = 0;
    let errorCount = 0;

    for (const activity of activities) {
      try {
        await this.syncActivityToExternalCalendars(activity, config);
        successCount++;
      } catch (error) {
        errorCount++;
        console.error(`Erro ao sincronizar atividade ${activity.id}:`, error);
      }
    }

    await supabase
      .from('calendar_integrations')
      .update({ last_sync: new Date().toISOString() })
      .eq('company_id', this.companyId);

    logEvent(this.companyId, 'system', 'CALENDAR_FULL_SYNC', 
      `Sincronização completa: ${successCount} sucessos, ${errorCount} erros`);
  }
}