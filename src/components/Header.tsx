import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, LogOut, Crown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { NotificationCenter } from "@/components/NotificationCenter";
import { UniversalChat } from "@/components/UniversalChat";
import { QtalentLogo } from "@/components/QtalentLogo";
import { MobileMenu } from "@/components/ui/mobile-menu";
import { useIsMobile } from "@/hooks/use-mobile";
import { HowItWorksModal } from "@/components/HowItWorksModal";
import { LocationSelector } from "@/components/LocationSelector";

import { ProfileMenu } from "@/components/ProfileMenu";
import { SubscriptionButton } from "@/components/SubscriptionButton";
import { SubscriptionModal } from "@/components/SubscriptionModal";
import { ModeSwitch } from "@/components/ModeSwitch";
import { useUserMode } from "@/contexts/UserModeContext";
import { useUnreadNotifications } from "@/hooks/useUnreadNotifications";
import { useUnreadMessages } from "@/hooks/useUnreadMessages";

export function Header() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { mode } = useUserMode();
  const { unreadCount } = useUnreadNotifications();
  const { unreadCount: chatUnreadCount } = useUnreadMessages();
  const [talentName, setTalentName] = useState<string | null>(null);
  const [talentId, setTalentId] = useState<string | null>(null);
  const [isProTalent, setIsProTalent] = useState<boolean>(false);
  const [profilePictureUrl, setProfilePictureUrl] = useState<string | null>(null);
  const [showHowItWorksModal, setShowHowItWorksModal] = useState(false);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  
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
      // Use the secure function to get talent profile data
      const { data: profileData, error } = await supabase.rpc('get_user_talent_profile');
      
      if (error) {
        console.error('Error fetching talent profile:', error);
        return;
      }

      if (profileData && profileData.length > 0) {
        const profile = profileData[0];
        setTalentName(profile.artist_name || null);
        setTalentId(profile.id || null);
        setIsProTalent(profile.is_pro_subscriber || false);
        
        // Get picture URL separately since it's not in the secure function
        const { data: pictureData } = await supabase
          .from('talent_profiles')
          .select('picture_url')
          .eq('user_id', user.id)
          .maybeSingle();
          
        setProfilePictureUrl(pictureData?.picture_url || null);
      } else {
        // Reset all states if no profile found
        setTalentName(null);
        setTalentId(null);
        setIsProTalent(false);
        setProfilePictureUrl(null);
      }
    } catch (error) {
      console.error('Error fetching talent profile:', error);
      // Reset states on error to avoid showing incomplete data
      setTalentName(null);
      setTalentId(null);
      setIsProTalent(false);
      setProfilePictureUrl(null);
    }
  };

  const handleAuthAction = () => {
    if (user) {
      signOut();
    } else {
      navigate("/auth", { state: { mode: 'booker' } });
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
    navigate("/");
  };


  const handleManageSubscription = () => {
    setShowSubscriptionModal(true);
  };


  return (
    <>
      <header className="relative w-full z-50 glass-card border-b border-card-border transition-all duration-300 ease-in-out hover:opacity-100 opacity-90">
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
                    Find Talents
                  </button>
                  {user && isProTalent && mode === 'artist' && (
                    <button 
                      onClick={() => navigate('/gigs')}
                      className="text-foreground hover:text-accent transition-colors font-medium"
                    >
                      Gigs
                    </button>
                  )}
                  <button 
                    onClick={() => setShowHowItWorksModal(true)}
                    className="text-foreground hover:text-accent transition-colors font-medium"
                  >
                    How it works
                  </button>
                  {user && talentName && mode === 'artist' && (
                    <button 
                      onClick={() => setShowSubscriptionModal(true)}
                      className="text-foreground hover:text-accent transition-colors font-medium flex items-center gap-2"
                    >
                      <Crown className="h-4 w-4" />
                      Upgrade to Pro
                    </button>
                  )}
                </>
              )}
            </div>

            {/* Desktop Right Side Actions */}
            <div className="hidden md:flex items-center space-x-4">
              {user ? (
                <div className="flex items-center space-x-4">
                  {/* Location selector and mode switch and notifications */}
                  <LocationSelector />
                  {talentName && <ModeSwitch />}
                  <div className="flex items-center gap-2">
                    <NotificationCenter />
                    {chatUnreadCount > 0 && (
                      <Badge variant="destructive" className="animate-pulse">
                        {chatUnreadCount} Chat{chatUnreadCount !== 1 ? 's' : ''}
                      </Badge>
                    )}
                  </div>
                   {/* No complete profile button needed - profiles are completed during signup */}
                   
                   {/* Only show subscription button in artist dashboard mode if not already shown in nav */}
                  {talentName && !showArtistDashboardNav && mode === 'artist' && (
                    <SubscriptionButton
                      isProSubscriber={isProTalent}
                      onSubscriptionChange={fetchTalentProfile}
                      variant="outline"
                      size="sm"
                    />
                  )}
                  
                  <div className="relative">
                    <ProfileMenu
                      talentName={talentName || undefined}
                      isProSubscriber={isProTalent}
                      profilePictureUrl={profilePictureUrl || undefined}
                      onManageSubscription={handleManageSubscription}
                      isTalent={!!talentName}
                    />
                    {unreadCount > 0 && (
                      <Badge 
                        variant="destructive" 
                        className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs animate-pulse"
                      >
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </Badge>
                    )}
                  </div>
                </div>
              ) : (
                <>
                  <LocationSelector />
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleAuthAction}
                    className="font-medium"
                  >
                    Sign In
                  </Button>
                  
                   <Button 
                     className="hero-button font-medium"
                     onClick={() => navigate("/talent-onboarding")}
                   >
                     Join as a Talent
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
                        className="text-left text-foreground hover:text-accent transition-colors font-medium py-2 relative flex items-center justify-between w-full"
                      >
                        <span>Dashboard</span>
                        {unreadCount > 0 && (
                          <Badge variant="destructive" className="h-5 w-5 p-0 flex items-center justify-center text-xs animate-pulse">
                            {unreadCount > 9 ? '9+' : unreadCount}
                          </Badge>
                        )}
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
                        // Close mobile menu
                        const mobileMenuClose = document.querySelector('[data-mobile-menu-close]') as HTMLElement;
                        if (mobileMenuClose) {
                          mobileMenuClose.click();
                        }
                      }}
                      className="text-left text-foreground hover:text-accent transition-colors font-medium py-2"
                    >
                      Find Talents
                    </button>
                    
                    {user && isProTalent && mode === 'artist' && (
                      <button 
                        onClick={() => navigate('/gigs')}
                        className="text-left text-foreground hover:text-accent transition-colors font-medium py-2"
                      >
                        Gigs
                      </button>
                    )}
                    
                    <button 
                      onClick={() => {
                        setShowHowItWorksModal(true);
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
                    
                    {user && talentName && mode === 'artist' && (
                      <button 
                        onClick={() => {
                          setShowSubscriptionModal(true);
                          // Close mobile menu
                          const mobileMenuClose = document.querySelector('[data-mobile-menu-close]') as HTMLElement;
                          if (mobileMenuClose) {
                            mobileMenuClose.click();
                          }
                        }}
                        className="text-left text-foreground hover:text-accent transition-colors font-medium py-2 flex items-center gap-2"
                      >
                        <Crown className="h-4 w-4" />
                        Upgrade to Pro
                      </button>
                    )}
                  </>
                )}

                {user && (
                  <>
                    <div className="border-t pt-4 mt-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="relative flex items-center">
                          <span 
                            className="text-sm font-bold text-foreground cursor-pointer hover:text-primary transition-colors"
                            onClick={handleWelcomeClick}
                          >
                            Welcome, {talentName || user.user_metadata?.name || user.email?.split('@')[0] || 'User'}
                          </span>
                          {unreadCount > 0 && (
                            <Badge 
                              variant="destructive" 
                              className="ml-2 h-5 w-5 p-0 flex items-center justify-center text-xs animate-pulse"
                            >
                              {unreadCount > 9 ? '9+' : unreadCount}
                            </Badge>
                          )}
                        </div>
                        {/* Only show switch to artist dashboard when talent is in booking mode */}
                       {talentName && <ModeSwitch size="sm" />}
                    </div>
                    
                    {/* Notifications in mobile menu */}
                    <div className="py-2 space-y-2">
                      <NotificationCenter />
                      {chatUnreadCount > 0 && (
                        <Badge variant="destructive" className="animate-pulse">
                          {chatUnreadCount} Unread Chat Message{chatUnreadCount !== 1 ? 's' : ''}
                        </Badge>
                      )}
                    </div>
                       {/* No complete profile button needed - profiles are completed during signup */}
                       
                       {talentName && !showArtistDashboardNav && mode === 'artist' && (
                        <SubscriptionButton
                          isProSubscriber={isProTalent}
                          onSubscriptionChange={fetchTalentProfile}
                          variant="default"
                          size="sm"
                          className="w-full mt-2"
                        />
                      )}
                      
                      {talentName && showArtistDashboardNav && mode === 'artist' && (
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
                       onClick={() => navigate("/talent-onboarding")}
                     >
                       Join as a Talent
                     </Button>
                   </div>
                 )}
               </MobileMenu>
               
                {/* Universal Chat - Always available for authenticated users */}
                {user && (
                  <UniversalChat />
                )}
             </div>
          </nav>
        </div>
      </header>

      <HowItWorksModal 
        open={showHowItWorksModal}
        onOpenChange={setShowHowItWorksModal}
      />

      <SubscriptionModal 
        open={showSubscriptionModal}
        onOpenChange={setShowSubscriptionModal}
      />
    </>
  );
}