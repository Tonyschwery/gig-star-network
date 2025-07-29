import { createPortal } from 'react-dom';
import { useUnreadNotifications } from '@/hooks/useUnreadNotifications';
import { useAuth } from '@/hooks/useAuth';

export function GlobalNotificationIndicator() {
  const { user } = useAuth();
  const { unreadCount } = useUnreadNotifications();

  // Don't render anything if user is not logged in or no unread notifications
  if (!user || unreadCount === 0) {
    return null;
  }

  // Find the header element to place our indicator
  const headerElement = document.querySelector('[data-notification-indicator]');
  
  if (!headerElement) {
    return null;
  }

  return createPortal(
    <div className="absolute -top-1 -right-1 w-3 h-3 bg-destructive rounded-full flex items-center justify-center">
      <span className="sr-only">{unreadCount} unread notifications</span>
    </div>,
    headerElement
  );
}