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
import { ProfileMenu } from "@/components/ProfileMenu";
import { SubscriptionButton } from "@/components/SubscriptionButton";
import { ModeSwitch } from "@/components/ModeSwitch";
import { useUserMode } from "@/contexts/UserModeContext";
import { useUnreadNotifications } from "@/hooks/useUnreadNotifications";

export function Header() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { mode } = useUserMode();
  const { unreadCount } = useUnreadNotifications();
  const [talentName, setTalentName] = useState<string | null>(null);
  const [talentId, setTalentId] = useState<string | null>(null);
  const [isProTalent, setIsProTalent] = useState<boolean>(false);
  const [profilePictureUrl, setProfilePictureUrl] = useState<string | null>(null);
  const [showProDialog, setShowProDialog] = useState(false);
  const isMobile = useIsMobile();
  
  // Check if we should show artist dashboard navigation
  const showArtistDashboardNav = talentName && mode === 'artist';

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
        .select('id, artist_name, is_pro_subscriber, picture_url')
        .eq('user_id', user.id)
        .maybeSingle();

      setTalentName(data?.artist_name || null);
      setTalentId(data?.id || null);
      setIsProTalent(data?.is_pro_subscriber || false);
      setProfilePictureUrl(data?.picture_url || null);
    } catch (error) {
      console.error('Error fetching talent profile:', error);
    }
  };

  const handleAuthAction = () => {
    if (user) {
      signOut();
    } else {
      navigate("/login");
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

  const handleManageSubscription = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('customer-portal', {
        headers: {
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
      });

      if (error) throw error;
      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error) {
      console.error('Error opening customer portal:', error);
    }
  };

  const handleChatNotificationClick = () => {
    // Navigate to appropriate dashboard where messages can be accessed
    if (talentName) {
      navigate("/talent-dashboard");
    } else if (user) {
      navigate("/booker-dashboard");
    }
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
              {showArtistDashboardNav ? (
                // Artist Dashboard Navigation
                <>
                  <button 
                    onClick={() => navigate('/talent-dashboard')}
                    className="text-foreground hover:text-accent transition-colors font-medium"
                  >
                    Dashboard
                  </button>
                  <SubscriptionButton
                    isProSubscriber={isProTalent}
                    onSubscriptionChange={fetchTalentProfile}
                    variant="ghost"
                    size="sm"
                  />
                </>
              ) : (
                // Public Navigation
                <>
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
                </>
              )}
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
                <div className="flex items-center space-x-4">
                  {/* Mode switch and notifications */}
                  {talentName && <ModeSwitch />}
                  <div className="relative">
                    <NotificationCenter />
                    {user && unreadCount > 0 && (
                      <div className="absolute -top-1 -right-1 w-3 h-3 bg-destructive rounded-full flex items-center justify-center">
                        <span className="sr-only">{unreadCount} unread notifications</span>
                      </div>
                    )}
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
                  
                  {/* Only show subscription button in artist dashboard mode if not already shown in nav */}
                  {talentName && !showArtistDashboardNav && (
                    <SubscriptionButton
                      isProSubscriber={isProTalent}
                      onSubscriptionChange={fetchTalentProfile}
                      variant="outline"
                      size="sm"
                    />
                  )}
                  
                  <ProfileMenu
                    talentName={talentName || undefined}
                    isProSubscriber={isProTalent}
                    profilePictureUrl={profilePictureUrl || undefined}
                    onManageSubscription={handleManageSubscription}
                    isTalent={!!talentName}
                  />
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
                {showArtistDashboardNav ? (
                  // Artist Dashboard Mobile Navigation
                  <>
                    <button 
                      onClick={() => {
                        navigate('/talent-dashboard');
                        // Close mobile menu
                        const mobileMenuClose = document.querySelector('[data-mobile-menu-close]') as HTMLElement;
                        if (mobileMenuClose) {
                          mobileMenuClose.click();
                        }
                      }}
                      className="text-left text-foreground hover:text-accent transition-colors font-medium py-2"
                    >
                      Dashboard
                    </button>
                  </>
                ) : (
                  // Public Mobile Navigation
                  <>
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
                  </>
                )}

                {user && (
                  <>
                    <div className="border-t pt-4 mt-4">
                      <div className="flex items-center justify-between mb-2">
                        <span 
                          className="text-sm font-bold text-foreground cursor-pointer hover:text-primary transition-colors"
                          onClick={handleWelcomeClick}
                        >
                          Welcome, {talentName || user.user_metadata?.name || user.email?.split('@')[0] || 'User'}
                        </span>
                        {/* Only show switch to artist dashboard when talent is in booking mode */}
                        {talentName && <ModeSwitch size="sm" />}
                      </div>
                      
                      {user && !talentName && user.user_metadata?.user_type === 'talent' && (
                        <Button 
                          className="w-full hero-button mt-2"
                          onClick={handleTalentSignup}
                        >
                          Complete Profile
                        </Button>
                      )}
                      
                      {talentName && !isProTalent && !showArtistDashboardNav && (
                        <Button 
                          className="w-full hero-button mt-2"
                          onClick={handleProButtonClick}
                        >
                          <Crown className="h-4 w-4 mr-2" />
                          Subscribe to Pro
                        </Button>
                      )}
                      
                      {talentName && showArtistDashboardNav && (
                        <SubscriptionButton
                          isProSubscriber={isProTalent}
                          onSubscriptionChange={fetchTalentProfile}
                          variant="outline"
                          size="sm"
                          className="w-full mt-2"
                        />
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
                      onClick={() => navigate("/login")}
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