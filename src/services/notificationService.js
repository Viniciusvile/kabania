import { supabase } from '../supabaseClient';

// Helper to create a notification
export async function createNotification(companyId, userId, type, content) {
  try {
    const { error } = await supabase
      .from('notifications')
      .insert([{
        company_id: companyId,
        user_id: userId, // null for company-wide broadcast
        type: type,
        content: content,
        read: false
      }]);
    
    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error creating notification:', error);
    return false;
  }
}

// Fetch user's notifications
export async function fetchNotifications(companyId) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('company_id', companyId)
      .or(`user_id.is.null,user_id.eq.${user.id}`)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return [];
  }
}

// Mark a notification as read (only works for user-specific ones due to RLS, or we can just track locally for global ones)
export async function markAsRead(notificationId) {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId);
      
    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return false;
  }
}

// Subscribe to real-time changes
export function subscribeToNotifications(companyId, callback) {
  const channel = supabase
    .channel('public:notifications')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `company_id=eq.${companyId}`
      },
      (payload) => {
        // Here we could filter by user_id if needed, but the callback can handle it
        callback(payload.new);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

// --- UTILITIES TO FIX BUILD ERRORS ---

export function getDeadlineStatus(deadline) {
  if (!deadline) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dDate = new Date(deadline + 'T00:00:00');
  dDate.setHours(0, 0, 0, 0);

  const diffTime = dDate - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return { color: 'red', icon: '🚨', label: 'Atrasado' };
  if (diffDays === 0) return { color: 'orange', icon: '⚠️', label: 'Vence Hoje' };
  if (diffDays <= 2) return { color: 'yellow', icon: '⏰', label: 'Próximo' };
  return { color: 'green', icon: '📅', label: 'No Prazo' };
}

export async function notifyComment(task, authorEmail) {
  const authorName = authorEmail.split('@')[0];
  const content = `💬 ${authorName} comentou em "${task.title}"`;
  return createNotification(task.company_id, null, 'comment', content);
}

export async function notifyTaskMoved(task, oldCol, newCol) {
  const content = `🚚 Tarefa "${task.title}" movida de ${oldCol} para ${newCol}`;
  return createNotification(task.company_id, null, 'kanban_move', content);
}

export async function notifyAssignment(task, assigneeEmail) {
  const name = assigneeEmail.split('@')[0];
  const content = `👤 ${name} foi designado para "${task.title}"`;
  return createNotification(task.company_id, null, 'assignment', content);
}

export async function checkDeadlineNotifications(tasks, companyId) {
  if (!tasks) return;
  tasks.forEach(task => {
    const status = getDeadlineStatus(task.deadline);
    if (status && (status.label === 'Atrasado' || status.label === 'Vence Hoje')) {
       // Targeted notification logic could go here
    }
  });
}
