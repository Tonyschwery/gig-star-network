import { Button } from '@/components/ui/button';
import { useUserMode } from '@/contexts/UserModeContext';
import { useNavigate } from 'react-router-dom';
import { ArrowRightLeft } from 'lucide-react';

interface ModeSwitchProps {
  className?: string;
  size?: "sm" | "default" | "lg";
}

export function ModeSwitch({ className, size = "sm" }: ModeSwitchProps) {
  const { mode, setMode, canSwitchToArtist } = useUserMode();
  const navigate = useNavigate();

  if (!canSwitchToArtist) {
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