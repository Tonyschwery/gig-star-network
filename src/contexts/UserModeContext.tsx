import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

type UserMode = 'booking' | 'artist';

interface UserModeContextType {
  mode: UserMode;
  setMode: (mode: UserMode) => void; // THE FIX: Name is changed back to 'setMode'
  canSwitchToArtist: boolean;
}
//gemini 13
const UserModeContext = createContext<UserModeContextType | undefined>(undefined);

export function UserModeProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [mode, setModeState] = useState<UserMode>('booking'); // Internal state setter
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
        console.error('Error checking talent profile in UserModeProvider:', error);
        setCanSwitchToArtist(false);
        setModeState('booking');
      }
    };

    checkTalentProfile();
  }, [user]);

  // THE FIX: A new function, named 'setMode', that handles both state and navigation.
  const setMode = (newMode: UserMode) => {
    setModeState(newMode); // Update the state
    if (newMode === 'booking') {
      // When switching to booking mode, navigate to the homepage.
      navigate('/');
    } else if (newMode === 'artist') {
      // When switching back to artist mode, navigate to the talent dashboard.
      navigate('/talent-dashboard');
    }
  };

  const value = {
    mode,
    setMode, // Provide the function with the correct name 'setMode'
    canSwitchToArtist,
  };

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