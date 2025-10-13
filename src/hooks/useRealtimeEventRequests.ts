import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export const useRealtimeEventRequests = (refreshEventRequests: () => void) => {
  const { user } = useAuth();
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!user) return;

    console.log('Setting up real-time event requests subscription for user:', user.id);

    // Subscribe to ALL event request changes (RLS will filter appropriately)
    const eventRequestChannel = supabase
      .channel(`event-requests-realtime-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'event_requests',
        },
        (payload) => {
          console.log('Event request change detected:', payload);
          refreshEventRequests();
        }
      )
      .subscribe((status) => {
        console.log('Event request subscription status:', status);
        setIsConnected(status === 'SUBSCRIBED');
      });

    return () => {
      console.log('Cleaning up real-time event requests subscription');
      supabase.removeChannel(eventRequestChannel);
      setIsConnected(false);
    };
  }, [user, refreshEventRequests]);

  return { isConnected };
};
