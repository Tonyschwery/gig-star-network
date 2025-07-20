import { Button } from "@/components/ui/button";
import { Search, User, Menu, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export function Header() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [talentName, setTalentName] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchTalentProfile();
    } else {
      setTalentName(null);
    }
  }, [user]);

  const fetchTalentProfile = async () => {
    if (!user) return;

    try {
      const { data } = await supabase
        .from('talent_profiles')
        .select('artist_name')
        .eq('user_id', user.id)
        .maybeSingle();

      setTalentName(data?.artist_name || null);
    } catch (error) {
      console.error('Error fetching talent profile:', error);
    }
  };

  const handleAuthAction = () => {
    if (user) {
      signOut();
    } else {
      navigate("/auth");
    }
  };

  const handleWelcomeClick = () => {
    if (talentName) {
      navigate("/talent-dashboard");
    }
  };

  return (
    <header className="fixed top-0 w-full z-50 glass-card border-b border-card-border">
      <div className="container mx-auto px-4 py-4">
        <nav className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center space-x-2 cursor-pointer" onClick={() => navigate('/')}>
            <div className="text-2xl font-bold gradient-text hover:opacity-80 transition-opacity">
              NAGHM
            </div>
            <span className="text-sm text-muted-foreground hidden sm:block">
              Book the Vibe
            </span>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-6">
            <button 
              onClick={() => {
                const talentsSection = document.getElementById('talents');
                if (talentsSection) {
                  talentsSection.scrollIntoView({ behavior: 'smooth' });
                } else {
                  navigate('/#talents');
                }
              }}
              className="text-foreground hover:text-brand-primary transition-colors"
            >
              Find Talent
            </button>
            <a href="#how-it-works" className="text-foreground hover:text-brand-primary transition-colors">
              How it works
            </a>
            <a href="#" className="text-foreground hover:text-brand-primary transition-colors">
              Pricing
            </a>
          </div>

          {/* Right Side Actions */}
          <div className="flex items-center space-x-4">
            <Button 
              variant="ghost" 
              size="sm" 
              className="hidden sm:flex"
              onClick={() => console.log('Search clicked')}
            >
              <Search className="h-4 w-4" />
            </Button>
            
            {user ? (
              <div className="flex items-center space-x-2">
                <span 
                  className={`text-sm text-muted-foreground hidden sm:block ${talentName ? 'cursor-pointer hover:text-primary transition-colors' : ''}`}
                  onClick={handleWelcomeClick}
                >
                  Welcome, {talentName || user.user_metadata?.name || user.email}
                </span>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleAuthAction}
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
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