import { useState } from "react";
import { Crown, Calendar, CreditCard, AlertTriangle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";

interface SubscriptionManagementModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subscriptionData?: {
    isProSubscriber: boolean;
    subscriptionStatus: string;
    planId?: string;
    currentPeriodEnd?: string;
    subscriptionStartedAt?: string;
    paypal_subscription_id?: string; // Added this ID
  };
}

export function SubscriptionManagementModal({ 
  open, 
  onOpenChange, 
  subscriptionData 
}: SubscriptionManagementModalProps) {
  const { toast } = useToast();

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };
  
  const calculateDaysRemaining = (endDate?: string) => {
    if (!endDate) return 0;
    const today = new Date();
    const end = new Date(endDate);
    const diffTime = end.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  };
  
  const calculateProgress = (startDate?: string, endDate?: string) => {
    if (!startDate || !endDate) return 0;
    const start = new Date(startDate);
    const end = new Date(endDate);
    const today = new Date();
    
    const totalDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
    const daysUsed = (today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
    
    return Math.min(100, Math.max(0, (daysUsed / totalDays) * 100));
  };
  
  const daysRemaining = calculateDaysRemaining(subscriptionData?.currentPeriodEnd);
  const progress = calculateProgress(subscriptionData?.subscriptionStartedAt, subscriptionData?.currentPeriodEnd);
  const isExpiringSoon = daysRemaining <= 7 && daysRemaining > 0;
  
  const handleCancelSubscription = () => {
    // This now builds a specific URL for the user's subscription
    if (subscriptionData?.paypal_subscription_id) {
        const subscriptionId = subscriptionData.paypal_subscription_id;
        const managementUrl = `https://www.paypal.com/cgi-bin/customerprofileweb?cmd=_manage-subscription&id=${subscriptionId}`;
        window.open(managementUrl, '_blank');
        toast({
          title: "Redirected to PayPal",
          description: "Manage your subscription directly in your PayPal account.",
        });
    } else {
        // Fallback to the generic page if the ID is not found
        window.open('https://www.paypal.com/myaccount/autopay/', '_blank');
        toast({
          title: "Redirected to PayPal",
          description: "Could not find a specific subscription ID. Please find the subscription in your PayPal account to manage it.",
          variant: "destructive"
        });
    }
  };

  const getPlanDisplayName = (planId?: string) => {
    if (!planId) return 'Pro Plan';
    if (planId.toLowerCase().includes('month')) return 'Monthly Pro';
    if (planId.toLowerCase().includes('year')) return 'Yearly Pro';
    return 'Pro Plan';
  };

  const benefits = [
    { icon: "📸", title: "10 Gallery Photos", description: "Showcase your work with a professional portfolio" },
    { icon: "🎵", title: "SoundCloud Integration", description: "Link your music directly to your profile" },
    { icon: "📺", title: "YouTube Integration", description: "Embed your performance videos" },
    { icon: "⭐", title: "Priority Listing", description: "Appear at the top of search results" },
    { icon: "🚀", title: "Unlimited Bookings", description: "Accept as many gigs as you want" },
    { icon: "💬", title: "Priority Support", description: "Get faster help when you need it" }
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Crown className="h-5 w-5 text-brand-warning" />
            Subscription Management
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {subscriptionData?.isProSubscriber ? (
            <>
              {/* Current Plan Card */}
              <Card className="p-6 border-brand-accent/20 bg-gradient-to-br from-brand-accent/5 to-transparent">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-brand-accent/10 rounded-lg">
                      <Crown className="h-5 w-5 text-brand-accent" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">{getPlanDisplayName(subscriptionData.planId)}</h3>
                      <p className="text-sm text-muted-foreground">$0.25/month • Active</p>
                    </div>
                  </div>
                  <Badge className="bg-brand-success text-background">Active</Badge>
                </div>

                {/* Billing Cycle Progress */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Billing cycle progress</span>
                    <span className="font-medium">{daysRemaining} days remaining</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Started: {formatDate(subscriptionData.subscriptionStartedAt)}</span>
                    <span>Next billing: {formatDate(subscriptionData.currentPeriodEnd)}</span>
                  </div>
                </div>

                {isExpiringSoon && (
                  <div className="mt-4 p-3 bg-brand-warning/10 border border-brand-warning/20 rounded-lg flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-brand-warning" />
                    <span className="text-sm">Your subscription renews in {daysRemaining} days</span>
                  </div>
                )}
              </Card>

              {/* Pro Benefits */}
              <Card className="p-6">
                <h4 className="font-semibold mb-4 flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  Your Pro Benefits
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {benefits.map((benefit, index) => (
                    <div key={index} className="flex items-center gap-3 p-3 bg-secondary/50 rounded-lg">
                      <span className="text-lg">{benefit.icon}</span>
                      <div>
                        <p className="text-sm font-medium">{benefit.title}</p>
                        <p className="text-xs text-muted-foreground">{benefit.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Management Actions */}
              <Card className="p-6">
                <h4 className="font-semibold mb-4 flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Manage Subscription
                </h4>
                <div className="space-y-4">
                  <div className="flex items-start gap-3 p-4 bg-secondary/30 rounded-lg">
                    <AlertTriangle className="h-5 w-5 text-brand-warning mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium mb-1">Cancellation Policy</p>
                      <p className="text-xs text-muted-foreground">
                        If you cancel, you'll keep Pro access until {formatDate(subscriptionData.currentPeriodEnd)}. 
                        After that, your account will revert to the free plan.
                      </p>
                    </div>
                  </div>
                  
                  <Button 
                    variant="destructive" 
                    onClick={handleCancelSubscription}
                    className="w-full"
                  >
                    Cancel Subscription via PayPal
                  </Button>
                  
                  <p className="text-xs text-muted-foreground text-center">
                    You'll be redirected to PayPal to manage your subscription
                  </p>
                </div>
              </Card>
            </>
          ) : (
            <Card className="p-6 text-center">
              <Crown className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Active Subscription</h3>
              <p className="text-muted-foreground mb-4">
                You don't have an active Pro subscription. Upgrade to unlock all Pro features!
              </p>
              <Button onClick={() => onOpenChange(false)}>
                Close
              </Button>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
