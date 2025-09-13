import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

type UserMode = 'booking' | 'artist';

interface UserModeContextType {
  mode: UserMode;
  switchMode: (newMode: UserMode) => void; // Changed from setMode for clarity
  canSwitchToArtist: boolean;
}
//gemini sep 13
const UserModeContext = createContext<UserModeContextType | undefined>(undefined);

export function UserModeProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const navigate = useNavigate(); // Get the navigate function from the router
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
        // Using our more reliable, secure RPC function
        const { data: hasProfile, error } = await supabase.rpc('check_talent_profile_exists', {
          user_id_to_check: user.id
        });
        
        if (error) throw error;

        setCanSwitchToArtist(hasProfile);
        
        // Auto-set the default mode when the user logs in
        if (hasProfile) {
          setMode('artist');
        } else {
          setMode('booking');
        }
      } catch (error) {
        console.error('Error checking talent profile in UserModeProvider:', error);
        setCanSwitchToArtist(false);
        setMode('booking');
      }
    };

    checkTalentProfile();
  }, [user]);

  // THE FIX: A new function that handles both the state change AND the navigation.
  const switchMode = (newMode: UserMode) => {
    setMode(newMode);
    if (newMode === 'booking') {
      // When a talent switches to booker view, send them to the homepage to browse.
      navigate('/');
    } else if (newMode === 'artist') {
      // When they switch back to artist view, send them to their dashboard.
      navigate('/talent-dashboard');
    }
  };

  const value = {
    mode,
    switchMode, // Provide the new function to the rest of the app
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