import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { CreditCard, Shield, DollarSign, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: {
    id: string;
    event_type: string;
    event_date: string;
    event_duration: number;
    event_location: string;
    talent_profiles?: {
      artist_name: string;
      rate_per_hour: number;
      is_pro_subscriber: boolean;
    };
  };
  onPaymentSuccess: () => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  booking,
  onPaymentSuccess
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const talentProfile = booking.talent_profiles;
  if (!talentProfile) return null;

  const hourlyRate = talentProfile.rate_per_hour;
  const hoursBooked = booking.event_duration;
  const totalAmount = hourlyRate * hoursBooked;
  
  // Commission logic: 0% for pro talents, 10% for non-pro talents
  const commissionRate = talentProfile.is_pro_subscriber ? 0 : 10;
  const platformCommission = (totalAmount * commissionRate) / 100;
  const processingFee = 2.99; // Mock processing fee
  const finalAmount = totalAmount + processingFee;

  const handlePayment = async () => {
    setIsProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke('process-payment', {
        body: { bookingId: booking.id }
      });

      if (error) {
        throw error;
      }

      if (data.success) {
        toast({
          title: "Payment Successful!",
          description: `Payment of $${finalAmount.toFixed(2)} processed successfully.`,
        });
        onPaymentSuccess();
        onClose();
      } else {
        throw new Error(data.error || 'Payment failed');
      }
    } catch (error) {
      console.error('Payment error:', error);
      toast({
        title: "Payment Failed",
        description: error instanceof Error ? error.message : "Failed to process payment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md mx-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Complete Payment
          </DialogTitle>
        </DialogHeader>

        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              {/* Booking Details */}
              <div>
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                  Booking Details
                </h3>
                <div className="mt-2 space-y-2">
                  <div className="flex justify-between">
                    <span>Artist:</span>
                    <span className="font-medium">{talentProfile.artist_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Event:</span>
                    <span className="font-medium capitalize">{booking.event_type}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Location:</span>
                    <span className="font-medium">{booking.event_location}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Date:</span>
                    <span className="font-medium">{new Date(booking.event_date).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Payment Breakdown */}
              <div>
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                  Payment Breakdown
                </h3>
                <div className="mt-2 space-y-2">
                  <div className="flex justify-between">
                    <span className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {hoursBooked} hour{hoursBooked !== 1 ? 's' : ''} × ${hourlyRate}/hr
                    </span>
                    <span className="font-medium">${totalAmount.toFixed(2)}</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="flex items-center gap-1">
                      <DollarSign className="h-4 w-4" />
                      Processing fee
                    </span>
                    <span className="font-medium">${processingFee.toFixed(2)}</span>
                  </div>

                  {commissionRate > 0 && (
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>Platform fee ({commissionRate}% to artist)</span>
                      <span>-${platformCommission.toFixed(2)}</span>
                    </div>
                  )}

                  {talentProfile.is_pro_subscriber && (
                    <div className="flex items-center gap-2 p-2 bg-green-50 dark:bg-green-950 rounded-md">
                      <Shield className="h-4 w-4 text-green-600" />
                      <span className="text-sm text-green-700 dark:text-green-300">
                        No platform fees - Pro Member!
                      </span>
                      <Badge variant="secondary" className="text-xs">PRO</Badge>
                    </div>
                  )}
                </div>
              </div>

              <Separator />

              {/* Total */}
              <div className="flex justify-between items-center text-lg font-semibold">
                <span>Total Amount:</span>
                <span>${finalAmount.toFixed(2)}</span>
              </div>

              {/* Mock Payment Notice */}
              <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-md">
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  🏗️ <strong>Demo Mode:</strong> This is a mock payment for demonstration. 
                  No real charges will be made.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={isProcessing}>
            Cancel
          </Button>
          <Button 
            onClick={handlePayment} 
            disabled={isProcessing}
            className="min-w-32"
          >
            {isProcessing ? (
              <>
                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                Processing...
              </>
            ) : (
              <>
                <CreditCard className="h-4 w-4 mr-2" />
                Pay ${finalAmount.toFixed(2)}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};