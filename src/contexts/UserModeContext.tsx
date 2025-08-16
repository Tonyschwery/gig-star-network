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
        // Use secure function to check if user has talent profile
        const { data: hasProfile, error } = await supabase.rpc('user_has_talent_profile');
        
        if (error) {
          console.error('Error checking talent profile:', error);
          setCanSwitchToArtist(false);
          setMode('booking');
          return;
        }

        setCanSwitchToArtist(hasProfile);
        
        // Auto-set mode based on user type if they have a talent profile
        if (hasProfile && user.user_metadata?.user_type === 'talent') {
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