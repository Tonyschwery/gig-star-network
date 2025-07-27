import { Button } from "@/components/ui/button";
import { Search, User, Menu, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { NotificationCenter } from "@/components/NotificationCenter";
import { QtalentLogo } from "@/components/QtalentLogo";

export function Header() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [talentName, setTalentName] = useState<string | null>(null);
  const [talentId, setTalentId] = useState<string | null>(null);
  const [isProTalent, setIsProTalent] = useState<boolean>(false);

  useEffect(() => {
    if (user) {
      fetchTalentProfile();
    } else {
      setTalentName(null);
      setTalentId(null);
    }
  }, [user]);

  const fetchTalentProfile = async () => {
    if (!user) return;

    try {
      const { data } = await supabase
        .from('talent_profiles')
        .select('id, artist_name, is_pro_subscriber')
        .eq('user_id', user.id)
        .maybeSingle();

      setTalentName(data?.artist_name || null);
      setTalentId(data?.id || null);
      setIsProTalent(data?.is_pro_subscriber || false);
    } catch (error) {
      console.error('Error fetching talent profile:', error);
    }
  };

  const handleAuthAction = () => {
    if (user) {
      signOut();
    } else {
      navigate("/booker-auth");
    }
  };

  const handleWelcomeClick = () => {
    if (talentName) {
      navigate("/talent-dashboard");
    } else if (user) {
      navigate("/booker-dashboard");
    }
  };

  const handleTalentSignup = () => {
    if (user && !talentName) {
      // User is logged in but doesn't have a talent profile
      navigate("/talent-onboarding");
    } else {
      // User is not logged in, go to auth
      navigate("/auth");
    }
  };

  return (
    <header className="fixed top-0 w-full z-50 glass-card border-b border-card-border">
      <div className="container mx-auto px-4 py-4">
        <nav className="flex items-center justify-between">
          {/* Logo */}
          <QtalentLogo onClick={() => navigate('/')} />

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <button 
              onClick={() => {
                const talentsSection = document.getElementById('talents');
                if (talentsSection) {
                  talentsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                } else {
                  navigate('/#talents');
                }
              }}
              className="text-foreground hover:text-accent transition-colors font-medium"
            >
              Find Talent
            </button>
            {user && isProTalent && (
              <button 
                onClick={() => navigate('/gigs')}
                className="text-foreground hover:text-accent transition-colors font-medium"
              >
                Gigs
              </button>
            )}
            <a href="#how-it-works" className="text-foreground hover:text-accent transition-colors font-medium">
              How it works
            </a>
            <button 
              onClick={() => navigate('/pricing')}
              className="text-foreground hover:text-accent transition-colors font-medium"
            >
              Pricing
            </button>
          </div>

          {/* Right Side Actions */}
          <div className="flex items-center space-x-2 md:space-x-4">
            <Button 
              variant="ghost" 
              size="sm" 
              className="hidden md:flex"
              onClick={() => console.log('Search clicked')}
            >
              <Search className="h-4 w-4" />
            </Button>
            
            {user ? (
              <div className="flex items-center space-x-1 md:space-x-2">
                <div className="flex items-center gap-1 md:gap-2">
                  <span 
                    className="text-xs md:text-sm text-muted-foreground cursor-pointer hover:text-primary transition-colors truncate max-w-[80px] md:max-w-none"
                    onClick={handleWelcomeClick}
                  >
                    Welcome, {talentName || user.user_metadata?.name || user.email?.split('@')[0] || 'User'}
                  </span>
                  <NotificationCenter />
                </div>
                {!talentName && (
                  <Button 
                    className="hero-button text-xs md:text-sm px-2 md:px-4"
                    size="sm"
                    onClick={handleTalentSignup}
                  >
                    <span className="hidden sm:inline">Complete Profile</span>
                    <span className="sm:hidden">Complete</span>
                  </Button>
                )}
                {talentName && !isProTalent && (
                  <Button 
                    className="hero-button text-xs md:text-sm px-2 md:px-4"
                    size="sm"
                    onClick={() => navigate('/pricing')}
                  >
                    <span className="hidden sm:inline">Subscribe to Pro</span>
                    <span className="sm:hidden">Pro</span>
                  </Button>
                )}
                <Button 
                  variant="outline" 
                  size="sm"
                  className="px-2 md:px-4"
                  onClick={handleAuthAction}
                >
                  <LogOut className="h-4 w-4 md:mr-2" />
                  <span className="hidden md:inline">Logout</span>
                </Button>
              </div>
            ) : (
              <>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleAuthAction}
                >
                  Login
                </Button>
                
                <Button 
                  className="hero-button"
                  onClick={() => navigate("/auth")}
                >
                  Join as Talent
                </Button>
              </>
            )}

            {/* Mobile Menu */}
            <Button 
              variant="ghost" 
              size="sm" 
              className="md:hidden"
              onClick={() => console.log('Mobile menu clicked')}
            >
              <Menu className="h-4 w-4" />
            </Button>
          </div>
        </nav>
      </div>
    </header>
  );
}