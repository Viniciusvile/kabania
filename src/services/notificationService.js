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
