import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Facebook, Twitter, Instagram, Linkedin, Mail } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

export function Footer() {
  const navigate = useNavigate();

  const handleSocialClick = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <footer className="bg-card border-t border-card-border">
      <div className="container mx-auto px-4 py-16">
        <div className="flex flex-col items-center text-center space-y-6">
          {/* Brand Section */}
          <div className="space-y-4 max-w-2xl">
            <div className="text-2xl font-bold text-foreground">Qtalent.live</div>
            <p className="text-muted-foreground">
              The simplest way to connect with exceptional live talent for your events. Book verified performers and
              creators worldwide.
            </p>
            <div className="flex justify-center space-x-3">
              <Button variant="ghost" size="sm" onClick={() => handleSocialClick("https://www.facebook.com/qtalentlive")}>
                <Facebook className="h-4 w-4" />
              </Button>

              <Button variant="ghost" size="sm" onClick={() => handleSocialClick("https://www.instagram.com/qtalent.live/")}>
                <Instagram className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => handleSocialClick("https://www.linkedin.com/in/qtalentlive/")}>
                <Linkedin className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <div className="border-t border-card-border mt-12 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <div className="text-muted-foreground text-sm">© 2024 Qtalent.live. All rights reserved.</div>
            <nav className="flex space-x-6 text-sm">
              <button
                onClick={() => navigate("/privacy-policy")}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Privacy Policy
              </button>
              <button
                onClick={() => navigate("/terms-of-service")}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Terms of Service
              </button>
              <button
                onClick={() => navigate("/trust-safety")}
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
