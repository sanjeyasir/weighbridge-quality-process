/**
 * Notification Service - Disabled as notifications are not required
 */

export function subscribeNotifications(currentUser, onNotificationsChanged) {
  if (onNotificationsChanged) onNotificationsChanged([]);
  return () => {};
}

export async function markNotificationAsRead() {
  return true;
}

export async function markAllNotificationsAsRead() {
  return true;
}

export async function createNotification() {
  // Notifications disabled
  return null;
}
