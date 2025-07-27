import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Facebook, Twitter, Instagram, Linkedin, Mail } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function Footer() {
  const navigate = useNavigate();

  return (
    <footer className="bg-card border-t border-card-border">
      <div className="container mx-auto px-4 py-16">
        <div className="grid lg:grid-cols-4 md:grid-cols-2 gap-8">
          {/* Brand */}
          <div className="space-y-4">
            <div className="text-2xl font-bold text-foreground">
              Qtalent.live
            </div>
            <p className="text-muted-foreground">
              The simplest way to connect with exceptional live talent for your events. Book verified performers and creators worldwide.
            </p>
            <div className="flex space-x-3">
              <Button variant="ghost" size="sm">
                <Facebook className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm">
                <Twitter className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm">
                <Instagram className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm">
                <Linkedin className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* For Clients */}
          <div className="space-y-4">
            <h4 className="font-semibold text-lg">For Clients</h4>
            <nav className="space-y-2">
              <button 
                onClick={() => {
                  const talentsSection = document.getElementById('talents');
                  if (talentsSection) {
                    talentsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  } else {
                    navigate('/#talents');
                  }
                }}
                className="block text-muted-foreground hover:text-foreground transition-colors text-left"
              >
                Find Talent
              </button>
              <button 
                onClick={() => navigate('/how-it-works')}
                className="block text-muted-foreground hover:text-foreground transition-colors text-left"
              >
                How It Works
              </button>
              <button 
                onClick={() => navigate('/your-event')}
                className="block text-muted-foreground hover:text-foreground transition-colors text-left"
              >
                Post Event Request
              </button>
              <button 
                onClick={() => navigate('/trust-safety')}
                className="block text-muted-foreground hover:text-foreground transition-colors text-left"
              >
                Trust & Safety
              </button>
            </nav>
          </div>

          {/* For Talents */}
          <div className="space-y-4">
            <h4 className="font-semibold text-lg">For Talents</h4>
            <nav className="space-y-2">
              <button 
                onClick={() => navigate('/auth')}
                className="block text-muted-foreground hover:text-foreground transition-colors text-left"
              >
                Join as Talent
              </button>
              <button 
                onClick={() => navigate('/pricing')}
                className="block text-muted-foreground hover:text-foreground transition-colors text-left"
              >
                Pro Membership
              </button>
              <button 
                onClick={() => navigate('/gigs')}
                className="block text-muted-foreground hover:text-foreground transition-colors text-left"
              >
                Browse Gigs
              </button>
              <button 
                onClick={() => navigate('/how-it-works')}
                className="block text-muted-foreground hover:text-foreground transition-colors text-left"
              >
                Getting Started
              </button>
            </nav>
          </div>

          {/* Newsletter */}
          <div className="space-y-4">
            <h4 className="font-semibold text-lg">Stay Updated</h4>
            <p className="text-muted-foreground text-sm">
              Get the latest news about new talents and booking opportunities.
            </p>
            <div className="space-y-2">
              <div className="flex space-x-2">
                <Input 
                  placeholder="Enter your email" 
                  className="bg-input border-border"
                />
                <Button size="sm" className="hero-button">
                  <Mail className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-card-border mt-12 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <div className="text-muted-foreground text-sm">
              © 2024 Qtalent.live. All rights reserved.
            </div>
            <nav className="flex space-x-6 text-sm">
              <button 
                onClick={() => navigate('/privacy-policy')}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Privacy Policy
              </button>
              <button 
                onClick={() => navigate('/terms-of-service')}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Terms of Service
              </button>
              <button 
                onClick={() => navigate('/trust-safety')}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Trust & Safety
              </button>
            </nav>
          </div>
        </div>
      </div>
    </footer>
  );
}