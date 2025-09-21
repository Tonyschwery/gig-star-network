import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { XCircle, Crown, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function SubscriptionCancelled() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-lg text-center">
        <CardHeader>
          <div className="flex justify-center mb-4">
            <XCircle className="h-16 w-16 text-muted-foreground" />
          </div>
          <CardTitle className="text-2xl font-bold text-foreground">
            Subscription Cancelled
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <div className="text-muted-foreground">
            <p className="mb-4">
              Your Pro subscription was cancelled and no payment has been processed.
            </p>
            
            <div className="text-left space-y-2 bg-secondary/30 rounded-lg p-4">
              <p className="text-sm font-medium mb-2">You're missing out on:</p>
              <div className="flex items-center gap-2 text-sm">
                <Crown className="h-4 w-4 text-brand-warning" />
                <span>0% Commission - Keep 100% of earnings</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Crown className="h-4 w-4 text-brand-warning" />
                <span>Pro badge for increased bookings</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Crown className="h-4 w-4 text-brand-warning" />
                <span>Featured placement in search</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Crown className="h-4 w-4 text-brand-warning" />
                <span>Unlimited booking requests</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <Button 
              className="hero-button"
              onClick={() => navigate("/")}
            >
              <Crown className="h-4 w-4 mr-2" />
              Try Pro Again
            </Button>
            <Button 
              variant="outline"
              onClick={() => navigate(-1)}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go Back
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            You can upgrade to Pro anytime to unlock all premium features and start earning more.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}