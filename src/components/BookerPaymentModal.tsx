import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { CreditCard, DollarSign, Calculator, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface BookerPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: {
    id: string;
    event_type: string;
    event_date: string;
    event_location: string;
    payment_id?: string;
    talent_profiles?: {
      artist_name: string;
    };
  };
  onPaymentSuccess: () => void;
}

interface PaymentData {
  id: string;
  total_amount: number;
  platform_commission: number;
  talent_earnings: number;
  commission_rate: number;
  currency: string;
  payment_status: string;
}

export const BookerPaymentModal: React.FC<BookerPaymentModalProps> = ({
  isOpen,
  onClose,
  booking,
  onPaymentSuccess
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [payment, setPayment] = useState<PaymentData | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen && booking.payment_id) {
      fetchPaymentDetails();
    }
  }, [isOpen, booking.payment_id]);

  const fetchPaymentDetails = async () => {
    if (!booking.payment_id) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('id', booking.payment_id)
        .single();

      if (error) throw error;
      setPayment(data);
    } catch (error) {
      console.error('Error fetching payment details:', error);
      toast({
        title: "Error",
        description: "Failed to load payment details.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async () => {
    if (!payment) return;

    setIsProcessing(true);
    try {
      // Mock payment processing - always succeeds
      const { data, error } = await supabase.functions.invoke('process-payment', {
        body: { 
          paymentId: payment.id
        }
      });

      if (error) {
        throw error;
      }

      if (data.success) {
        toast({
          title: "Booking approved successfully!",
          description: `Payment of ${payment.currency} ${payment.total_amount.toFixed(2)} processed successfully. Your booking is confirmed!`,
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

  if (loading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-md mx-auto">
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!payment) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-md mx-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-600" />
              No Invoice Found
            </DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground">
            No payment information is available for this booking yet. 
            The talent may still be preparing your invoice.
          </p>
          <DialogFooter>
            <Button onClick={onClose}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  const isAlreadyPaid = payment.payment_status === 'completed';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md mx-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isAlreadyPaid ? (
              <>
                <CheckCircle className="h-5 w-5 text-green-600" />
                Payment Completed
              </>
            ) : (
              <>
                <CreditCard className="h-5 w-5" />
                Complete Payment
              </>
            )}
          </DialogTitle>
        </DialogHeader>

        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              {/* Booking Details */}
              <div>
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                  Invoice Details
                </h3>
                <div className="mt-2 space-y-2">
                  <div className="flex justify-between">
                    <span>Artist:</span>
                    <span className="font-medium">{booking.talent_profiles?.artist_name || 'Unknown'}</span>
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
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                  <Calculator className="h-4 w-4" />
                  Payment Breakdown
                </h3>
                <div className="mt-2 space-y-2">
                  <div className="flex justify-between">
                    <span>Total Amount:</span>
                    <span className="font-medium">{payment.currency} {payment.total_amount.toFixed(2)}</span>
                  </div>
                  
                  {payment.platform_commission > 0 && (
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>Platform Commission ({payment.commission_rate}%):</span>
                      <span>{payment.currency} {payment.platform_commission.toFixed(2)}</span>
                    </div>
                  )}
                  
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Artist Earnings:</span>
                    <span>{payment.currency} {payment.talent_earnings.toFixed(2)}</span>
                  </div>
                  
                  <Separator />
                  
                  <div className="flex justify-between items-center text-lg font-semibold">
                    <span>You Pay:</span>
                    <span className="text-green-600">{payment.currency} {payment.total_amount.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Status */}
              {isAlreadyPaid && (
                <div className="p-3 bg-green-50 dark:bg-green-950 rounded-md">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm text-green-700 dark:text-green-300 font-medium">
                      Payment completed successfully!
                    </span>
                  </div>
                  <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                    Your booking is confirmed and the artist has been notified.
                  </p>
                </div>
              )}

              {/* Demo Notice */}
              {!isAlreadyPaid && (
                <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-md">
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    🎭 <strong>Demo Mode:</strong> This is a mock payment for demonstration. 
                    No real charges will be made. The payment will be instantly processed.
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={isProcessing}>
            {isAlreadyPaid ? 'Close' : 'Cancel'}
          </Button>
          {!isAlreadyPaid && (
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
                  <DollarSign className="h-4 w-4 mr-2" />
                  Pay {payment.currency} {payment.total_amount.toFixed(2)}
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};