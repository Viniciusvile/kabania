/**
 * Notification Service
 * Stores notifications per user in localStorage: `synapseNotifications_<email>`
 * Each notification: { id, type, taskId, taskTitle, message, timestamp, read }
 * Types: 'assignment' | 'moved' | 'deadline' | 'comment'
 */

export function getNotifications(email) {
  if (!email) return [];
  try {
    return JSON.parse(localStorage.getItem(`synapseNotifications_${email}`) || '[]');
  } catch {
    return [];
  }
}

export function saveNotifications(email, notifications) {
  if (!email) return;
  localStorage.setItem(`synapseNotifications_${email}`, JSON.stringify(notifications));
}

export function addNotification(email, { type, taskId, taskTitle, message }) {
  if (!email) return;
  const notifications = getNotifications(email);
  const newNotif = {
    id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    type,
    taskId,
    taskTitle,
    message,
    timestamp: new Date().toISOString(),
    read: false
  };
  saveNotifications(email, [newNotif, ...notifications].slice(0, 50)); // keep max 50
}

export function markAllRead(email) {
  const notifications = getNotifications(email);
  saveNotifications(email, notifications.map(n => ({ ...n, read: true })));
}

export function getUnreadCount(email) {
  return getNotifications(email).filter(n => !n.read).length;
}

/**
 * Notify all assignees of a task about a column change.
 * Call this from KanbanBoard when a task changes column.
 */
export function notifyTaskMoved(task, newColumnTitle, currentUser) {
  if (!task.assignees?.length) return;
  task.assignees.forEach(email => {
    if (email === currentUser) return; // don't notify yourself
    addNotification(email, {
      type: 'moved',
      taskId: task.id,
      taskTitle: task.title,
      message: `"${task.title}" foi movido para ${newColumnTitle}`
    });
  });
}

/**
 * Notify newly added assignees.
 */
export function notifyAssignment(task, newAssignees, currentUser) {
  newAssignees.forEach(email => {
    if (email === currentUser) return;
    addNotification(email, {
      type: 'assignment',
      taskId: task.id,
      taskTitle: task.title,
      message: `Você foi adicionado à tarefa "${task.title}"`
    });
  });
}

/**
 * Notify a task assignee about a new comment.
 */
export function notifyComment(task, commenterEmail) {
  if (!task.assignees?.length) return;
  task.assignees.forEach(email => {
    if (email === commenterEmail) return;
    addNotification(email, {
      type: 'comment',
      taskId: task.id,
      taskTitle: task.title,
      message: `${commenterEmail} comentou em "${task.title}"`
    });
  });
}

/**
 * Check all tasks for upcoming deadlines, notify assignees.
 * Call this on app load or periodically.
 */
export function checkDeadlineNotifications(tasks, currentUser) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const twoDaysFromNow = new Date(today);
  twoDaysFromNow.setDate(twoDaysFromNow.getDate() + 2);

  tasks.forEach(task => {
    if (!task.deadline || !task.assignees?.length) return;
    const deadline = new Date(task.deadline);
    deadline.setHours(0, 0, 0, 0);

    const isOverdue = deadline < today;
    const isDueSoon = deadline >= today && deadline <= twoDaysFromNow;

    if (isOverdue || isDueSoon) {
      task.assignees.forEach(email => {
        const existingNotifs = getNotifications(email);
        const alreadyNotified = existingNotifs.some(
          n => n.taskId === task.id && n.type === 'deadline' &&
          new Date(n.timestamp).toDateString() === today.toDateString()
        );
        if (!alreadyNotified) {
          addNotification(email, {
            type: 'deadline',
            taskId: task.id,
            taskTitle: task.title,
            message: isOverdue
              ? `"${task.title}" está em atraso!`
              : `"${task.title}" vence em breve`
          });
        }
      });
    }
  });
}

export function getDeadlineStatus(deadline) {
  if (!deadline) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(deadline);
  d.setHours(0, 0, 0, 0);
  const diffDays = Math.round((d - today) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return { label: 'Em atraso', color: 'red', icon: '🔴', days: diffDays };
  if (diffDays === 0) return { label: 'Hoje!', color: 'orange', icon: '🟠', days: 0 };
  if (diffDays <= 3) return { label: `${diffDays}d`, color: 'yellow', icon: '🟡', days: diffDays };
  return { label: `${diffDays}d`, color: 'green', icon: '🟢', days: diffDays };
}

export function formatNotifTime(isoString) {
  const d = new Date(isoString);
  const now = new Date();
  const diffMs = now - d;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'agora';
  if (mins < 60) return `${mins}m atrás`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h atrás`;
  const days = Math.floor(hours / 24);
  return `${days}d atrás`;
}
