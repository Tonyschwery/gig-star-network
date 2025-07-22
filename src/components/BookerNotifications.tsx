import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Bell, BellRing } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface BookerNotificationsProps {
  userId: string;
}

export function BookerNotifications({ userId }: BookerNotificationsProps) {
  const { user } = useAuth();
  const [newNotificationsCount, setNewNotificationsCount] = useState(0);
  const [hasNew, setHasNew] = useState(false);

  useEffect(() => {
    if (!user || !userId) return;

    // Fetch initial count of approved bookings that are "new" (status changed recently)
    const fetchInitialCount = async () => {
      try {
        const { count, error } = await supabase
          .from('bookings')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId)
          .eq('status', 'approved')
          .gte('updated_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()); // Last 24 hours

        if (error) {
          console.error('Error fetching booking count:', error);
          return;
        }

        setNewNotificationsCount(count || 0);
        setHasNew((count || 0) > 0);
      } catch (error) {
        console.error('Error in fetchInitialCount:', error);
      }
    };

    fetchInitialCount();

    // Listen for booking status updates in real-time
    const channel = supabase
      .channel('booker-notifications')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'bookings',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          // When a booking status changes to approved or declined
          if (payload.old?.status === 'pending' && payload.new?.status !== 'pending') {
            setNewNotificationsCount(prev => prev + 1);
            setHasNew(true);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, userId]);

  // Reset notifications when user clicks on them
  const handleNotificationClick = () => {
    setNewNotificationsCount(0);
    setHasNew(false);
  };

  if (!hasNew || newNotificationsCount === 0) {
    return (
      <div className="relative">
        <Bell className="h-5 w-5 text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="relative cursor-pointer" onClick={handleNotificationClick}>
      <BellRing className="h-5 w-5 text-primary animate-pulse" />
      <Badge 
        variant="destructive" 
        className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs"
      >
        {newNotificationsCount > 99 ? '99+' : newNotificationsCount}
      </Badge>
    </div>
  );
}