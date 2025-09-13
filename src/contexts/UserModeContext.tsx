import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

type UserMode = 'booking' | 'artist';

interface UserModeContextType {
  mode: UserMode;
  setMode: (mode: UserMode) => void;
  canSwitchToArtist: boolean;
}

const UserModeContext = createContext<UserModeContextType | undefined>(undefined);

export function UserModeProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth(); // It now gets the user from our stable useAuth hook
  const navigate = useNavigate();
  const [mode, setModeState] = useState<UserMode>('booking');
  const [canSwitchToArtist, setCanSwitchToArtist] = useState(false);

  useEffect(() => {
    // This logic now safely determines the user's role based on their metadata
    const userType = user?.user_metadata?.user_type;
    const hasTalentProfile = userType === 'talent';
    
    setCanSwitchToArtist(hasTalentProfile);
    
    if (hasTalentProfile) {
      setModeState('artist');
    } else {
      setModeState('booking');
    }
  }, [user]);

  // The navigation logic is now safe because the user state is stable
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