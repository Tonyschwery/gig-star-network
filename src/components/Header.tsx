import { Button } from "@/components/ui/button";
import { Search, User, Menu, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

export function Header() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  const handleAuthAction = () => {
    if (user) {
      signOut();
    } else {
      navigate("/auth");
    }
  };

  return (
    <header className="fixed top-0 w-full z-50 glass-card border-b border-card-border">
      <div className="container mx-auto px-4 py-4">
        <nav className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center space-x-2">
            <div className="text-2xl font-bold gradient-text">
              GCC Talents
            </div>
            <span className="text-sm text-muted-foreground hidden sm:block">
              Booking Services
            </span>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-6">
            <a href="#" className="text-foreground hover:text-brand-primary transition-colors">
              Find Talent
            </a>
            <a href="#" className="text-foreground hover:text-brand-primary transition-colors">
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
                <span className="text-sm text-muted-foreground hidden sm:block">
                  Welcome, {user.user_metadata?.name || user.email}
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