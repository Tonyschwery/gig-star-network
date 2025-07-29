import { Button } from '@/components/ui/button';
import { useUserMode } from '@/contexts/UserModeContext';
import { useNavigate } from 'react-router-dom';
import { ArrowRightLeft } from 'lucide-react';
import { useLocation } from 'react-router-dom';

interface ModeSwitchProps {
  className?: string;
  size?: "sm" | "default" | "lg";
}

export function ModeSwitch({ className, size = "sm" }: ModeSwitchProps) {
  const { mode, setMode, canSwitchToArtist } = useUserMode();
  const navigate = useNavigate();
  const location = useLocation();

  if (!canSwitchToArtist) {
    return null;
  }

  // On talent dashboard, show "Switch to Booking"
  // In header (when talent is in booking mode), show "Switch to Artist Dashboard"
  const isOnTalentDashboard = location.pathname === '/talent-dashboard';
  
  // Only show the switch button if:
  // 1. User is on talent dashboard (show "Switch to Booking")
  // 2. User is a talent in booking mode and NOT on talent dashboard (show "Switch to Artist Dashboard")
  if (!isOnTalentDashboard && mode === 'artist') {
    return null;
  }

  const handleSwitch = () => {
    if (mode === 'booking') {
      setMode('artist');
      navigate('/talent-dashboard');
    } else {
      setMode('booking');
      navigate('/');
    }
  };

  return (
    <Button
      variant="outline"
      size={size}
      onClick={handleSwitch}
      className={`gap-2 ${className}`}
    >
      <ArrowRightLeft className="h-4 w-4" />
      {mode === 'booking' ? 'Switch to Artist Dashboard' : 'Switch to Booking'}
    </Button>
  );
}