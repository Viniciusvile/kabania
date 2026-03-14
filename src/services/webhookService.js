/**
 * Webhook Service
 * Handles sending notifications to external platforms like Slack or Discord.
 */

export async function sendNotification(message, data = {}) {
  const WEBHOOK_URL = import.meta.env.VITE_NOTIFICATION_WEBHOOK_URL;

  if (!WEBHOOK_URL || WEBHOOK_URL === 'YOUR_WEBHOOK_HERE') {
    console.warn("Webhook URL não configurado. Notificação ignorada.");
    return;
  }

  try {
    const payload = {
      content: message, // Support Discord
      text: message,    // Support Slack
      attachments: [
        {
          color: data.type === 'success' ? '#22c55e' : '#3b82f6',
          fields: Object.entries(data.details || {}).map(([key, value]) => ({
            title: key,
            value: value,
            short: true
          }))
        }
      ]
    };

    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return true;
  } catch (error) {
    console.error("Erro ao enviar notificação via Webhook:", error);
    return false;
  }
}
