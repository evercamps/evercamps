import { hookable } from '../../../lib/util/hookable.js';
import { getValueSync } from '../../../lib/util/registry.js';

function addNotificationMessage(
  request: any,
  message: string,
  type = 'info'
): void {
  const notification = {
    message: getValueSync('notificationMessage', message),
    type // Support 'success', 'error', 'info', 'warning'
  };

  const { session } = request;

  session.notifications = session.notifications || [];
  session.notifications.push(notification);
}

export const getNotifications = (request: any) => {
  const { session } = request;

  const notifications = session.notifications || [];

  session.notifications = [];

  return notifications;
};

export const addNotification = (
  request: any,
  message: string,
  type?: string
) => hookable(addNotificationMessage)(request, message, type);