import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

type UserMode = 'booking' | 'artist';
//gemini 13 7pm
interface UserModeContextType {
  mode: UserMode;
  setMode: (mode: UserMode) => void;
  canSwitchToArtist: boolean;
}

const UserModeContext = createContext<UserModeContextType | undefined>(undefined);

export function UserModeProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<UserMode>('booking');
  const [canSwitchToArtist, setCanSwitchToArtist] = useState(false);
  
  // A ref to track if this is the initial, automatic mode setting
  const isInitialLoad = useRef(true);

  // Effect 1: This effect runs only when the user logs in or out.
  // Its job is to determine the user's capabilities and set their default mode.
  useEffect(() => {
    const checkTalentProfile = async () => {
      if (!user) {
        setCanSwitchToArtist(false);
        setMode('booking');
        isInitialLoad.current = true; // Reset for next login
        return;
      }

      try {
        const { data: hasProfile, error } = await supabase.rpc('check_talent_profile_exists', {
          user_id_to_check: user.id
        });
        
        if (error) throw error;

        setCanSwitchToArtist(hasProfile);
        
        if (hasProfile) {
          setMode('artist');
        } else {
          setMode('booking');
        }
      } catch (error) {
        console.error('Error checking talent profile in UserModeProvider:', error);
        setCanSwitchToArtist(false);
        setMode('booking');
      } finally {
        // After the initial check is done, we allow navigation side-effects
        setTimeout(() => { isInitialLoad.current = false; }, 0);
      }
    };

    checkTalentProfile();
  }, [user]);

  // Effect 2 (THE FIX): This effect is now solely responsible for navigation
  // when the mode is changed *by the user*.
  useEffect(() => {
    // We do NOT navigate on the initial, automatic mode setting.
    // We only navigate on subsequent, user-initiated changes.
    if (isInitialLoad.current) {
      return;
    }

    if (mode === 'booking') {
      navigate('/');
    } else if (mode === 'artist' && canSwitchToArtist) {
      navigate('/talent-dashboard');
    }
  }, [mode, canSwitchToArtist, navigate]);


  const value = {
    mode,
    setMode, // The switch button will call this, which updates the 'mode' state, triggering the effect above.
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