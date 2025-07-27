import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Check, X, CreditCard, AlertCircle } from "lucide-react";
import { format } from "date-fns";

interface BookerPaymentActionsProps {
  booking: {
    id: string;
    event_type: string;
    event_date: string;
    status: string;
    talent_profiles?: {
      artist_name: string;
    };
  };
  payment: {
    id: string;
    total_amount: number;
    currency: string;
    platform_commission: number;
    talent_earnings: number;
    payment_status: string;
  };
  onPaymentUpdate: () => void;
}

export function BookerPaymentActions({ booking, payment, onPaymentUpdate }: BookerPaymentActionsProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const handleAcceptAndPay = async () => {
    setIsProcessing(true);
    
    try {
      // Create Stripe checkout session (mockup for now)
      const { data, error } = await supabase.functions.invoke('process-payment', {
        body: {
          paymentId: payment.id,
          successUrl: `${window.location.origin}/payment-success`,
          cancelUrl: `${window.location.origin}/booking-details/${booking.id}`
        }
      });

      if (error) throw error;

      // Redirect to Stripe checkout (in new tab for demo)
      if (data?.url) {
        window.open(data.url, '_blank');
        
        toast({
          title: "Redirecting to payment",
          description: "You'll be redirected to secure payment processing.",
        });
      }
    } catch (error) {
      console.error('Error processing payment:', error);
      toast({
        title: "Payment Error",
        description: "Failed to process payment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeclineInvoice = async () => {
    setIsProcessing(true);
    
    try {
      const { error } = await supabase
        .from('payments')
        .update({ payment_status: 'declined' })
        .eq('id', payment.id);

      if (error) throw error;

      toast({
        title: "Invoice Declined",
        description: "You have declined this invoice. The talent has been notified.",
      });
      
      onPaymentUpdate();
    } catch (error) {
      console.error('Error declining invoice:', error);
      toast({
        title: "Error",
        description: "Failed to decline invoice. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-500/20 text-yellow-700 border-yellow-500/20';
      case 'completed':
        return 'bg-green-500/20 text-green-700 border-green-500/20';
      case 'declined':
        return 'bg-red-500/20 text-red-700 border-red-500/20';
      default:
        return 'bg-muted';
    }
  };

  return (
    <Card className="glass-card border-orange-500/20">
      <CardHeader>
        <CardTitle className="flex items-center text-orange-700">
          <CreditCard className="h-5 w-5 mr-2" />
          Invoice Received
        </CardTitle>
        <CardDescription>
          {booking.talent_profiles?.artist_name} has sent you an invoice for your {booking.event_type} event
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="font-medium">Payment Status:</span>
          <Badge className={getStatusColor(payment.payment_status)}>
            {payment.payment_status}
          </Badge>
        </div>

        <div className="border rounded-lg p-4 bg-muted/10">
          <h4 className="font-medium mb-3">Invoice Details</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Event Date:</span>
              <span>{format(new Date(booking.event_date), 'PPP')}</span>
            </div>
            <div className="flex justify-between">
              <span>Total Amount:</span>
              <span className="font-medium">{payment.currency} {payment.total_amount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Platform Fee:</span>
              <span>{payment.currency} {payment.platform_commission.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Artist Earnings:</span>
              <span>{payment.currency} {payment.talent_earnings.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {payment.payment_status === 'pending' && (
          <div className="space-y-3">
            <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
              <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-blue-900 dark:text-blue-100">Demo Mode</p>
                <p className="text-blue-700 dark:text-blue-300">
                  This is a demo payment flow. In production, you would be redirected to Stripe for secure payment processing.
                </p>
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button
                onClick={handleAcceptAndPay}
                disabled={isProcessing}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white"
              >
                <Check className="h-4 w-4 mr-2" />
                {isProcessing ? 'Processing...' : 'Accept & Pay'}
              </Button>
              <Button
                onClick={handleDeclineInvoice}
                disabled={isProcessing}
                variant="destructive"
                className="flex-1"
              >
                <X className="h-4 w-4 mr-2" />
                Decline Invoice
              </Button>
            </div>
          </div>
        )}

        {payment.payment_status === 'completed' && (
          <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-green-600" />
              <span className="font-medium text-green-900 dark:text-green-100">
                Payment Completed
              </span>
            </div>
            <p className="text-sm text-green-700 dark:text-green-300 mt-1">
              Thank you for your payment! The talent has been notified.
            </p>
          </div>
        )}

        {payment.payment_status === 'declined' && (
          <div className="p-3 bg-red-50 dark:bg-red-950/20 rounded-lg">
            <div className="flex items-center gap-2">
              <X className="h-4 w-4 text-red-600" />
              <span className="font-medium text-red-900 dark:text-red-100">
                Invoice Declined
              </span>
            </div>
            <p className="text-sm text-red-700 dark:text-red-300 mt-1">
              You have declined this invoice. The talent has been notified.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}