import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  const navigate = useNavigate();
  const [mode, setModeState] = useState<UserMode>('booking');
  const [canSwitchToArtist, setCanSwitchToArtist] = useState(false);

  useEffect(() => {
    const checkTalentProfile = async () => {
      if (!user) {
        setCanSwitchToArtist(false);
        setModeState('booking');
        return;
      }
      try {
        const { data: hasProfile, error } = await supabase.rpc('check_talent_profile_exists', {
          user_id_to_check: user.id
        });
        if (error) throw error;
        setCanSwitchToArtist(hasProfile);
        if (hasProfile) {
          setModeState('artist');
        } else {
          setModeState('booking');
        }
      } catch (error) {
        console.error('Error in UserModeProvider checking profile:', error);
        setCanSwitchToArtist(false);
        setModeState('booking');
      }
    };
    checkTalentProfile();
  }, [user]);

  const setMode = (newMode: UserMode) => {
    setModeState(newMode);
    // This timeout prevents a race condition between the state update and navigation
    setTimeout(() => {
      if (newMode === 'booking') {
        navigate('/');
      } else if (newMode === 'artist' && canSwitchToArtist) {
        navigate('/talent-dashboard');
      }
    }, 0);
  };

  const value = { mode, setMode, canSwitchToArtist };

  return (
    <UserModeContext.Provider value={value}>
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