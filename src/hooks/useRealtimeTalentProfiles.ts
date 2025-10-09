import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useRealtimeTalentProfiles = (refreshTalents: () => void) => {
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    console.log('Setting up real-time talent profiles subscription');

    // Subscribe to talent profile changes
    const talentProfileChannel = supabase
      .channel('talent-profiles-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'talent_profiles',
        },
        (payload) => {
          console.log('Talent profile change detected:', payload);
          refreshTalents();
        }
      )
      .subscribe((status) => {
        console.log('Talent profile subscription status:', status);
        setIsConnected(status === 'SUBSCRIBED');
      });

    return () => {
      console.log('Cleaning up real-time talent profiles subscription');
      supabase.removeChannel(talentProfileChannel);
      setIsConnected(false);
    };
  }, [refreshTalents]);

  return { isConnected };
};
