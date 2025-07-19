import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Facebook, Twitter, Instagram, Linkedin, Mail } from "lucide-react";

export function Footer() {
  return (
    <footer className="bg-card border-t border-card-border">
      <div className="container mx-auto px-4 py-16">
        <div className="grid lg:grid-cols-4 md:grid-cols-2 gap-8">
          {/* Brand */}
          <div className="space-y-4">
            <div className="text-2xl font-bold gradient-text">
              GCC Talents
            </div>
            <p className="text-muted-foreground">
              The easiest way to book amazing talent for your events. Connect with verified performers and creators worldwide.
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
              <a href="#" className="block text-muted-foreground hover:text-foreground transition-colors">
                Find Talent
              </a>
              <a href="#" className="block text-muted-foreground hover:text-foreground transition-colors">
                How It Works
              </a>
              <a href="#" className="block text-muted-foreground hover:text-foreground transition-colors">
                Event Types
              </a>
              <a href="#" className="block text-muted-foreground hover:text-foreground transition-colors">
                Trust & Safety
              </a>
            </nav>
          </div>

          {/* For Talents */}
          <div className="space-y-4">
            <h4 className="font-semibold text-lg">For Talents</h4>
            <nav className="space-y-2">
              <a href="#" className="block text-muted-foreground hover:text-foreground transition-colors">
                Join as Talent
              </a>
              <a href="#" className="block text-muted-foreground hover:text-foreground transition-colors">
                Pro Membership
              </a>
              <a href="#" className="block text-muted-foreground hover:text-foreground transition-colors">
                Success Stories
              </a>
              <a href="#" className="block text-muted-foreground hover:text-foreground transition-colors">
                Resources
              </a>
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
              © 2024 GCC Talents. All rights reserved.
            </div>
            <nav className="flex space-x-6 text-sm">
              <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                Privacy Policy
              </a>
              <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                Terms of Service
              </a>
              <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                Cookie Policy
              </a>
            </nav>
          </div>
        </div>
      </div>
    </footer>
  );
}