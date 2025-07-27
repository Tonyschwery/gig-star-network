import { Button } from "@/components/ui/button";
import { Search, LogOut, Crown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { NotificationCenter } from "@/components/NotificationCenter";
import { QtalentLogo } from "@/components/QtalentLogo";
import { MobileMenu } from "@/components/ui/mobile-menu";
import { useIsMobile } from "@/hooks/use-mobile";
import { ProSubscriptionDialog } from "@/components/ProSubscriptionDialog";

export function Header() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [talentName, setTalentName] = useState<string | null>(null);
  const [talentId, setTalentId] = useState<string | null>(null);
  const [isProTalent, setIsProTalent] = useState<boolean>(false);
  const [showProDialog, setShowProDialog] = useState(false);
  const isMobile = useIsMobile();

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
      navigate("/auth");
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

  const handleProButtonClick = () => {
    if (isMobile) {
      setShowProDialog(true);
    } else {
      navigate('/pricing');
    }
  };

  const handleRefreshProfile = () => {
    fetchTalentProfile();
    setShowProDialog(false);
  };

  return (
    <>
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
                onClick={() => {
                  const upgradeSection = document.getElementById('upgrade-to-pro');
                  if (upgradeSection) {
                    upgradeSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  } else {
                    navigate('/pricing#upgrade-to-pro');
                  }
                }}
                className="text-foreground hover:text-accent transition-colors font-medium"
              >
                Pricing
              </button>
            </div>

            {/* Desktop Right Side Actions */}
            <div className="hidden md:flex items-center space-x-4">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => console.log('Search clicked')}
              >
                <Search className="h-4 w-4" />
              </Button>
              
              {user ? (
                <div className="flex items-center space-x-2">
                  <div className="flex items-center gap-2">
                    <span 
                      className="text-sm font-bold text-foreground cursor-pointer hover:text-primary transition-colors"
                      onClick={handleWelcomeClick}
                    >
                      Welcome, {talentName || user.user_metadata?.name || user.email?.split('@')[0] || 'User'}
                    </span>
                    <NotificationCenter />
                  </div>
                  {user && !talentName && user.user_metadata?.user_type === 'talent' && (
                    <Button 
                      className="hero-button text-sm px-4"
                      size="sm"
                      onClick={handleTalentSignup}
                    >
                      Complete Profile
                    </Button>
                  )}
                  {talentName && !isProTalent && (
                    <Button 
                      className="hero-button text-sm px-4"
                      size="sm"
                      onClick={handleProButtonClick}
                    >
                      Subscribe to Pro
                    </Button>
                  )}
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="px-4"
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
            </div>

            {/* Mobile Menu */}
            <div className="md:hidden">
              <MobileMenu>
                {/* Mobile Navigation Links */}
                <button 
                  onClick={() => {
                    const talentsSection = document.getElementById('talents');
                    if (talentsSection) {
                      talentsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    } else {
                      navigate('/#talents');
                    }
                  }}
                  className="text-left text-foreground hover:text-accent transition-colors font-medium py-2"
                >
                  Find Talent
                </button>
                
                {user && isProTalent && (
                  <button 
                    onClick={() => navigate('/gigs')}
                    className="text-left text-foreground hover:text-accent transition-colors font-medium py-2"
                  >
                    Gigs
                  </button>
                )}
                
                <button 
                  onClick={() => {
                    const section = document.getElementById('how-it-works');
                    if (section) {
                      section.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                    // Close mobile menu - trigger click on overlay/close button
                    const mobileMenuClose = document.querySelector('[data-mobile-menu-close]') as HTMLElement;
                    if (mobileMenuClose) {
                      mobileMenuClose.click();
                    }
                  }}
                  className="text-left text-foreground hover:text-accent transition-colors font-medium py-2"
                >
                  How it works
                </button>
                
                <button 
                  onClick={() => {
                    const upgradeSection = document.getElementById('upgrade-to-pro');
                    if (upgradeSection) {
                      upgradeSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    } else {
                      navigate('/pricing#upgrade-to-pro');
                    }
                    // Close mobile menu
                    const mobileMenuClose = document.querySelector('[data-mobile-menu-close]') as HTMLElement;
                    if (mobileMenuClose) {
                      mobileMenuClose.click();
                    }
                  }}
                  className="text-left text-foreground hover:text-accent transition-colors font-medium py-2"
                >
                  Pricing
                </button>

                {user && (
                  <>
                    <div className="border-t pt-4 mt-4">
                      <span 
                        className="text-sm font-bold text-foreground cursor-pointer hover:text-primary transition-colors block py-2"
                        onClick={handleWelcomeClick}
                      >
                        Welcome, {talentName || user.user_metadata?.name || user.email?.split('@')[0] || 'User'}
                      </span>
                      
                      {user && !talentName && user.user_metadata?.user_type === 'talent' && (
                        <Button 
                          className="w-full hero-button mt-2"
                          onClick={handleTalentSignup}
                        >
                          Complete Profile
                        </Button>
                      )}
                      
                      {talentName && !isProTalent && (
                        <Button 
                          className="w-full hero-button mt-2"
                          onClick={handleProButtonClick}
                        >
                          <Crown className="h-4 w-4 mr-2" />
                          Subscribe to Pro
                        </Button>
                      )}
                      
                      
                      <Button 
                        variant="outline" 
                        className="w-full mt-2"
                        onClick={handleAuthAction}
                      >
                        <LogOut className="h-4 w-4 mr-2" />
                        Logout
                      </Button>
                    </div>
                  </>
                )}

                {!user && (
                  <div className="border-t pt-4 mt-4 space-y-2">
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={handleAuthAction}
                    >
                      Login
                    </Button>
                    
                    <Button 
                      className="w-full hero-button"
                      onClick={() => navigate("/auth")}
                    >
                      Join as Talent
                    </Button>
                  </div>
                )}
              </MobileMenu>
            </div>
          </nav>
        </div>
      </header>

      {/* Pro Subscription Dialog */}
      <ProSubscriptionDialog
        open={showProDialog}
        onOpenChange={setShowProDialog}
        onSubscribe={handleRefreshProfile}
        profileId={talentId || 'temp-id'}
      />
    </>
  );
}