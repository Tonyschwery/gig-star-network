import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

type UserMode = 'booking' | 'artist';
//7pm
interface UserModeContextType {
  mode: UserMode;
  setMode: (mode: UserMode) => void;
  canSwitchToArtist: boolean;
}

const UserModeContext = createContext<UserModeContextType | undefined>(undefined);

export function UserModeProvider({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [mode, setModeState] = useState<UserMode>('booking');
  const [canSwitchToArtist, setCanSwitchToArtist] = useState(false);

  // This effect has ONE job: set the user's default mode when they log in.
  // It does NOT perform any navigation.
  useEffect(() => {
    // We wait until the main authentication check is complete.
    if (authLoading) {
      return;
    }

    if (!user) {
      setCanSwitchToArtist(false);
      setModeState('booking');
      return;
    }
    
    // Once we have a user, check if they have a talent profile.
    const checkTalentProfile = async () => {
      const { data: hasProfile, error } = await supabase.rpc('check_talent_profile_exists', {
        user_id_to_check: user.id
      });

      if (error) {
        console.error('Error checking talent profile:', error);
        setCanSwitchToArtist(false);
        setModeState('booking');
        return;
      }
      
      setCanSwitchToArtist(hasProfile);
      if (hasProfile) {
        setModeState('artist');
      } else {
        setModeState('booking');
      }
    };
    
    checkTalentProfile();
  }, [user, authLoading]);

  // This is the function the <ModeSwitch> button will call.
  // It has ONE job: update the mode and navigate immediately.
  const setMode = (newMode: UserMode) => {
    setModeState(newMode);
    if (newMode === 'booking') {
      navigate('/');
    } else if (newMode === 'artist' && canSwitchToArtist) {
      navigate('/talent-dashboard');
    }
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