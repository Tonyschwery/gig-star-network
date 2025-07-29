import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { User, Settings, LogOut, Crown, MessageSquare, Calendar, DollarSign } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

interface ProfileMenuProps {
  talentName?: string;
  isProSubscriber?: boolean;
  profilePictureUrl?: string;
  onManageSubscription?: () => void;
  isTalent?: boolean; // New prop to indicate if user is a talent
}

export function ProfileMenu({ 
  talentName, 
  isProSubscriber, 
  profilePictureUrl,
  onManageSubscription,
  isTalent 
}: ProfileMenuProps) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const displayName = talentName || user?.email?.split('@')[0] || 'User';
  const initials = displayName.split(' ').map(n => n[0]).join('').toUpperCase();

  const handleSignOut = async () => {
    try {
      setIsLoading(true);
      await signOut();
      toast({
        title: "Signed out successfully",
        description: "You have been logged out of your account.",
      });
      navigate('/');
    } catch (error) {
      toast({
        title: "Error signing out",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleNavigation = (path: string) => {
    navigate(path);
  };

  // Determine the correct dashboard URL based on user type
  const getDashboardUrl = () => {
    return isTalent ? '/talent-dashboard' : '/booker-dashboard';
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="relative h-10 w-10 rounded-full focus-visible:ring-2 focus-visible:ring-primary"
        >
          <Avatar className="h-10 w-10">
            <AvatarImage src={profilePictureUrl} alt={displayName} />
            <AvatarFallback className="bg-primary text-primary-foreground text-sm font-medium">
              {initials}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent 
        className="w-64 bg-background border border-border shadow-lg" 
        align="end" 
        forceMount
      >
        <div className="flex items-center justify-start gap-2 p-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={profilePictureUrl} alt={displayName} />
            <AvatarFallback className="bg-primary text-primary-foreground text-sm font-medium">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col space-y-1 leading-none">
            <p className="font-medium text-sm text-foreground">{displayName}</p>
            <p className="text-xs text-muted-foreground truncate w-36">{user?.email}</p>
            {isProSubscriber && (
              <Badge variant="secondary" className="w-fit text-xs">
                <Crown className="h-3 w-3 mr-1" />
                Pro
              </Badge>
            )}
          </div>
        </div>
        
        <DropdownMenuSeparator />
        
        {/* Only show Edit Profile for talents */}
        {isTalent && (
          <DropdownMenuItem 
            onClick={() => handleNavigation('/talent-profile-edit')}
            className="cursor-pointer hover:bg-accent"
          >
            <User className="mr-2 h-4 w-4" />
            <span>Edit Profile</span>
          </DropdownMenuItem>
        )}
        
        {/* Dashboard link for bookers only */}
        {!isTalent && (
          <DropdownMenuItem 
            onClick={() => handleNavigation('/booker-dashboard')}
            className="cursor-pointer hover:bg-accent"
          >
            <User className="mr-2 h-4 w-4" />
            <span>{displayName} - Dashboard</span>
          </DropdownMenuItem>
        )}
        
        <DropdownMenuSeparator />
        
        {/* Only show subscription/earnings options for talents */}
        {isTalent && (
          <>
            {isProSubscriber ? (
              <DropdownMenuItem 
                onClick={onManageSubscription}
                className="cursor-pointer hover:bg-accent"
              >
                <Crown className="mr-2 h-4 w-4" />
                <span>Manage Subscription</span>
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem 
                onClick={onManageSubscription}
                className="cursor-pointer hover:bg-accent"
              >
                <Crown className="mr-2 h-4 w-4" />
                <span>Upgrade to Pro</span>
              </DropdownMenuItem>
            )}
            
          </>
        )}
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem 
          onClick={handleSignOut}
          disabled={isLoading}
          className="cursor-pointer hover:bg-accent text-destructive focus:text-destructive"
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span>{isLoading ? 'Signing out...' : 'Sign out'}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}