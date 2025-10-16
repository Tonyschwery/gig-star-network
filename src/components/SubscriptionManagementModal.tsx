import { useState } from "react";
import { Crown, Calendar, CreditCard, AlertTriangle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface SubscriptionManagementModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subscriptionData?: {
    isProSubscriber: boolean;
    subscriptionStatus: string;
    planId?: string;
    currentPeriodEnd?: string;
    subscriptionStartedAt?: string;
    paypal_subscription_id?: string;
  };
}

export function SubscriptionManagementModal({
  open,
  onOpenChange,
  subscriptionData,
}: SubscriptionManagementModalProps) {
  const { toast } = useToast();
  const [isConfirmingCancel, setIsConfirmingCancel] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
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
    // Instead of redirecting, open our own confirmation dialog
    setIsConfirmingCancel(true);
  };

  const executeCancellation = async () => {
    if (!subscriptionData?.paypal_subscription_id) {
      toast({ title: "Error", description: "Subscription ID not found. Cannot cancel.", variant: "destructive" });
      return;
    }
    setIsCancelling(true);
    try {
      const { error } = await supabase.functions.invoke("cancel-paypal-subscription", {
        body: { subscriptionId: subscriptionData.paypal_subscription_id },
      });

      if (error) throw error;

      toast({
        title: "Cancellation Request Sent",
        description:
          "Your subscription will be cancelled shortly. You'll retain Pro access until the end of your billing period.",
      });
      // The webhook will handle the database update. We can close the modal optimistically.
      onOpenChange(false);
    } catch (error) {
      console.error("Cancellation failed:", error);
      toast({
        title: "Cancellation Failed",
        description: "We couldn't cancel your subscription. Please try again or contact support.",
        variant: "destructive",
      });
    } finally {
      setIsCancelling(false);
      setIsConfirmingCancel(false);
    }
  };

  const getPlanDisplayName = (planId?: string) => {
    if (!planId) return "Pro Plan";
    if (planId.toLowerCase().includes("month")) return "Monthly Pro";
    if (planId.toLowerCase().includes("year")) return "Yearly Pro";
    return "Pro Plan";
  };

  const benefits = [
    { icon: "📸", title: "10 Gallery Photos", description: "Showcase your work with a professional portfolio" },
    { icon: "🎵", title: "SoundCloud Integration", description: "Link your music directly to your profile" },
    { icon: "📺", title: "YouTube Integration", description: "Embed your performance videos" },
    { icon: "⭐", title: "Priority Listing", description: "Appear at the top of search results" },
    { icon: "🚀", title: "Unlimited Bookings", description: "Accept as many gigs as you want" },
    { icon: "💬", title: "Priority Support", description: "Get faster help when you need it" },
  ];

  return (
    <>
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
                {/* Cards for plan, benefits, etc. remain the same */}
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
                <Card className="p-6">
                  <h4 className="font-semibold mb-4 flex items-center gap-2">
                    <CreditCard className="h-4 w-4" /> Your Pro Benefits
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
                <Card className="p-6">
                  <h4 className="font-semibold mb-4 flex items-center gap-2">
                    <Calendar className="h-4 w-4" /> Manage Subscription
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
                    <Button variant="destructive" onClick={handleCancelSubscription} className="w-full">
                      Cancel Subscription
                    </Button>
                    <p className="text-xs text-muted-foreground text-center">
                      Your subscription will be cancelled via PayPal.
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
                <Button onClick={() => onOpenChange(false)}>Close</Button>
              </Card>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isConfirmingCancel} onOpenChange={setIsConfirmingCancel}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will cancel your Pro subscription. You will retain Pro access until the end of your current billing
              period.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Go Back</AlertDialogCancel>
            <AlertDialogAction onClick={executeCancellation} disabled={isCancelling}>
              {isCancelling ? "Cancelling..." : "Yes, Cancel Subscription"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
