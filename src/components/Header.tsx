import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { QtalentLogo } from '@/components/QtalentLogo';
import { ProfileMenu } from '@/components/ProfileMenu';
import { ModeSwitch } from './ModeSwitch';
import { useUserMode } from '@/contexts/UserModeContext';
import { MobileMenu } from './ui/mobile-menu';

export const Header = () => {
  const { session, loading } = useAuth();
  const { userMode } = useUserMode();

  const renderUserAuth = () => {
    if (loading) {
      return null;
    }

    if (session) {
      return (
        <div className="flex items-center space-x-4">
          <ProfileMenu />
        </div>
      );
    }

    return (
      <div className="hidden md:flex items-center space-x-2">
        <Button variant="ghost" asChild>
          <Link to="/login">Log In</Link>
        </Button>
        <Button asChild>
          <Link to="/login?type=signup">Sign Up</Link>
        </Button>
      </div>
    );
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center">
        <div className="mr-4 hidden md:flex">
          <Link to="/" className="mr-6 flex items-center space-x-2">
            <QtalentLogo />
          </Link>
          <nav className="flex items-center space-x-6 text-sm font-medium">
            <Link to="/how-it-works">How It Works</Link>
            <Link to="/pricing">Pricing</Link>
            <Link to="/trust-safety">Trust & Safety</Link>
          </nav>
        </div>
        <MobileMenu />
        <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
          {session && <ModeSwitch />}
          <nav className="flex items-center">
            {renderUserAuth()}
          </nav>
        </div>
      </div>
    </header>
  );
};
