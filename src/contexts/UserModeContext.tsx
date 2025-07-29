import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

type UserMode = 'booking' | 'artist';

interface UserModeContextType {
  mode: UserMode;
  setMode: (mode: UserMode) => void;
  canSwitchToArtist: boolean;
}

const UserModeContext = createContext<UserModeContextType | undefined>(undefined);

export function UserModeProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [mode, setMode] = useState<UserMode>('booking');
  const [canSwitchToArtist, setCanSwitchToArtist] = useState(false);

  useEffect(() => {
    const checkTalentProfile = async () => {
      if (!user) {
        setCanSwitchToArtist(false);
        setMode('booking');
        return;
      }

      try {
        const { data: profile } = await supabase
          .from('talent_profiles')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();

        setCanSwitchToArtist(!!profile);
        
        // Auto-set mode based on user type if they have a talent profile
        if (profile && user.user_metadata?.user_type === 'talent') {
          setMode('artist');
        } else {
          setMode('booking');
        }
      } catch (error) {
        console.error('Error checking talent profile:', error);
        setCanSwitchToArtist(false);
        setMode('booking');
      }
    };

    checkTalentProfile();
  }, [user]);

  return (
    <UserModeContext.Provider value={{ mode, setMode, canSwitchToArtist }}>
      {children}
    </UserModeContext.Provider>
  );
}

export function useUserMode() {
  const context = useContext(UserModeContext);
  if (context === undefined) {
    throw new Error('useUserMode must be used within a UserModeProvider');
  }
  return context;
}