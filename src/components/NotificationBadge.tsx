import React from 'react';
import { Badge } from "@/components/ui/badge";
import { useUnreadNotifications } from "@/hooks/useUnreadNotifications";

export const NotificationBadge = () => {
  const { unreadCount, loading } = useUnreadNotifications();

  if (loading || unreadCount === 0) {
    return null;
  }

  return (
    <Badge 
      variant="destructive" 
      className="bg-red-500 hover:bg-red-600 text-white animate-pulse"
    >
      {unreadCount} New
    </Badge>
  );
};