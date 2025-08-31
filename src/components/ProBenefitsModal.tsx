import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Crown,
  Camera,
  Music,
  Video,
  Star,
  Users,
  TrendingUp,
  ArrowRight,
  CheckCircle
} from "lucide-react";
import { useNavigate } from "react-router-dom";

interface ProBenefitsModalProps {
  isOpen: boolean;
  onClose: () => void;
  showCongratulations?: boolean;
}

export function ProBenefitsModal({ isOpen, onClose, showCongratulations = false }: ProBenefitsModalProps) {
  const navigate = useNavigate();

  const benefits = [
    {
      icon: <Camera className="h-5 w-5" />,
      title: "10 Gallery Photos",
      description: "Upload up to 10 high-quality photos to showcase your talent",
      action: "Add Photos",
      actionPath: "/talent-profile-edit"
    },
    {
      icon: <Music className="h-5 w-5" />,
      title: "SoundCloud Integration",
      description: "Link your SoundCloud profile to share your music",
      action: "Add SoundCloud",
      actionPath: "/talent-profile-edit"
    },
    {
      icon: <Video className="h-5 w-5" />,
      title: "YouTube Integration",
      description: "Connect your YouTube channel to showcase video content",
      action: "Add YouTube",
      actionPath: "/talent-profile-edit"
    },
    {
      icon: <Users className="h-5 w-5" />,
      title: "Unlimited Bookings",
      description: "Accept unlimited booking requests per month",
      action: "View Bookings",
      actionPath: "/talent-dashboard/bookings"
    },
    {
      icon: <TrendingUp className="h-5 w-5" />,
      title: "Priority Listing",
      description: "Get higher visibility in search results",
      action: "View Profile",
      actionPath: "/talent-profile"
    },
    {
      icon: <Star className="h-5 w-5" />,
      title: "Pro Badge",
      description: "Display the premium Pro badge on your profile",
      action: "See Badge",
      actionPath: "/talent-profile"
    }
  ];

  const handleActionClick = (path: string) => {
    onClose();
    navigate(path);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="text-center">
          {showCongratulations && (
            <div className="mb-4">
              <div className="w-16 h-16 bg-gradient-to-r from-primary to-secondary rounded-full flex items-center justify-center mx-auto mb-4">
                <Crown className="h-8 w-8 text-white" />
              </div>
              <Badge variant="secondary" className="bg-gradient-to-r from-primary to-secondary text-white border-0 mb-2">
                <CheckCircle className="h-3 w-3 mr-1" />
                Payment Successful!
              </Badge>
            </div>
          )}
          
          <DialogTitle className="text-2xl font-bold gradient-text">
            {showCongratulations ? "Welcome to Pro!" : "Pro Benefits"}
          </DialogTitle>
          <DialogDescription className="text-lg text-muted-foreground">
            {showCongratulations 
              ? "Your Pro subscription is now active. Here's what you can do now:"
              : "Unlock these premium features with your Pro subscription"
            }
          </DialogDescription>
        </DialogHeader>

        {showCongratulations ? (
          <Card className="glass-card p-6 mt-6">
            <div className="space-y-4">
              <h3 className="text-headline text-center mb-6">Your Pro Benefits</h3>
              <div className="grid gap-3">
                {benefits.map((benefit, index) => (
                  <div key={index} className="flex items-center gap-4 p-3 rounded-lg bg-accent/5 border border-accent/20">
                    <div className="w-8 h-8 bg-accent/20 rounded-full flex items-center justify-center flex-shrink-0">
                      {benefit.icon}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-sm text-foreground">{benefit.title}</h4>
                      <p className="text-xs text-muted-foreground">{benefit.description}</p>
                    </div>
                    <CheckCircle className="h-4 w-4 text-accent flex-shrink-0" />
                  </div>
                ))}
              </div>
            </div>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 gap-4 mt-6">
            {benefits.map((benefit, index) => (
              <Card key={index} className="glass-card hover:shadow-lg transition-all duration-300">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                      {benefit.icon}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-sm mb-1">{benefit.title}</h3>
                      <p className="text-xs text-muted-foreground mb-3">{benefit.description}</p>
                      <Button
                        size="sm"
                        onClick={() => handleActionClick(benefit.actionPath)}
                        className="w-full text-xs"
                      >
                        {benefit.action}
                        <ArrowRight className="h-3 w-3 ml-1" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {showCongratulations && (
          <div className="text-center mt-6 p-4 bg-gradient-to-r from-accent/10 to-brand-success/10 rounded-lg border border-accent/20">
            <p className="text-sm text-muted-foreground mb-3">
              Ready to enhance your profile? Start by adding more photos and connecting your social media!
            </p>
            <Button
              onClick={() => handleActionClick("/talent-profile-edit")}
              className="hero-button"
            >
              Edit Profile Now
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        )}

        <div className="flex justify-end mt-6">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}