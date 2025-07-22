import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Bell, BellRing } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface BookingNotificationsProps {
  talentId: string;
}

export function BookingNotifications({ talentId }: BookingNotificationsProps) {
  const { user } = useAuth();
  const [newBookingsCount, setNewBookingsCount] = useState(0);
  const [hasNew, setHasNew] = useState(false);

  useEffect(() => {
    if (!user || !talentId) return;

    // Fetch initial count of pending bookings
    const fetchInitialCount = async () => {
      try {
        const { count, error } = await supabase
          .from('bookings')
          .select('*', { count: 'exact', head: true })
          .eq('talent_id', talentId)
          .eq('status', 'pending');

        if (error) {
          console.error('Error fetching booking count:', error);
          return;
        }

        setNewBookingsCount(count || 0);
        setHasNew((count || 0) > 0);
      } catch (error) {
        console.error('Error in fetchInitialCount:', error);
      }
    };

    fetchInitialCount();

    // Listen for new bookings in real-time
    const channel = supabase
      .channel('booking-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'bookings',
          filter: `talent_id=eq.${talentId}`
        },
        () => {
          setNewBookingsCount(prev => prev + 1);
          setHasNew(true);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'bookings',
          filter: `talent_id=eq.${talentId}`
        },
        (payload) => {
          // When a booking status changes from pending, decrease count
          if (payload.old?.status === 'pending' && payload.new?.status !== 'pending') {
            setNewBookingsCount(prev => Math.max(0, prev - 1));
            if (newBookingsCount <= 1) {
              setHasNew(false);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, talentId, newBookingsCount]);

  if (!hasNew || newBookingsCount === 0) {
    return (
      <div className="relative">
        <Bell className="h-5 w-5 text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="relative">
      <BellRing className="h-5 w-5 text-primary animate-pulse" />
      <Badge 
        variant="destructive" 
        className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs"
      >
        {newBookingsCount > 99 ? '99+' : newBookingsCount}
      </Badge>
    </div>
  );
}