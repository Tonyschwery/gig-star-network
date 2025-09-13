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
  const { status, mode, setMode } = useAuth();
  
  const canSwitchToArtist = status === 'TALENT_COMPLETE';

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