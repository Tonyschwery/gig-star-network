import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useUnreadNotifications } from '@/hooks/useUnreadNotifications';

interface ChatNotificationBellProps {
  onClick?: () => void;
  className?: string;
}

export function ChatNotificationBell({ onClick, className }: ChatNotificationBellProps) {
  const { unreadCount, loading } = useUnreadNotifications();

  if (loading) {
    return (
      <Button variant="ghost" size="sm" className={className}>
        <Bell className="h-4 w-4" />
      </Button>
    );
  }

  return (
    <Button 
      variant="ghost" 
      size="sm" 
      onClick={onClick}
      className={`relative ${className}`}
    >
      <Bell className="h-4 w-4" />
      {unreadCount > 0 && (
        <Badge 
          variant="destructive" 
          className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
        >
          {unreadCount > 99 ? '99+' : unreadCount}
        </Badge>
      )}
    </Button>
  );
}