import React, { createContext, useContext } from 'react';
import { useAuth } from '@/hooks/useAuth';

type UserMode = 'booking' | 'artist';
//9pm
interface UserModeContextType {
  mode: UserMode;
  setMode: (mode: UserMode) => void;
  canSwitchToArtist: boolean;
}

const UserModeContext = createContext<UserModeContextType | undefined>(undefined);

export function UserModeProvider({ children }: { children: React.ReactNode }) {
  const { role, profileStatus, mode, setMode } = useAuth();
  
  // User can switch to artist mode if they are a talent with a complete profile
  const canSwitchToArtist = role === 'talent' && profileStatus === 'complete';

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