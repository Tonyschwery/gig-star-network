import React from 'react';
import { Badge } from "@/components/ui/badge";
import { useUnreadNotifications } from "@/hooks/useUnreadNotifications";

export const BookerNotificationBadge = () => {
  const { unreadCount, loading } = useUnreadNotifications();

  if (loading || unreadCount === 0) {
    return null;
  }

  return (
    <div className="flex justify-center mb-4">
      <Badge 
        variant="destructive" 
        className="bg-red-500 hover:bg-red-600 text-white animate-pulse px-3 py-1"
      >
        {unreadCount} New Notification{unreadCount > 1 ? 's' : ''}
      </Badge>
    </div>
  );
};