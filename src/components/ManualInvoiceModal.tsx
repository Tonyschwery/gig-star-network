import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CreditCard, DollarSign, Calculator } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ManualInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: {
    id: string;
    event_type: string;
    event_date: string;
    event_location: string;
    talent_profiles?: {
      artist_name: string;
    };
  };
  onInvoiceSuccess: () => void;
}

export const ManualInvoiceModal: React.FC<ManualInvoiceModalProps> = ({
  isOpen,
  onClose,
  booking,
  onInvoiceSuccess
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [agreedPrice, setAgreedPrice] = useState('');
  const [currency, setCurrency] = useState('USD');
  const { toast } = useToast();

  const price = parseFloat(agreedPrice) || 0;
  const platformCommissionRate = 15; // 15% platform commission
  const platformCommission = (price * platformCommissionRate) / 100;
  const talentEarnings = price - platformCommission;

  const handleSendInvoice = async () => {
    if (!agreedPrice || price <= 0) {
      toast({
        title: "Invalid Price",
        description: "Please enter a valid agreed price.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-manual-invoice', {
        body: { 
          bookingId: booking.id,
          agreedPrice: price,
          currency: currency,
          platformCommissionRate: platformCommissionRate
        }
      });

      if (error) {
        throw error;
      }

      if (data.success) {
        toast({
          title: "Invoice Sent!",
          description: `Invoice for ${currency} ${price.toFixed(2)} has been sent to the booker.`,
        });
        
        onInvoiceSuccess();
        onClose();
        
        // Reset form
        setAgreedPrice('');
        setCurrency('USD');
      } else {
        throw new Error(data.error || 'Failed to send invoice');
      }
    } catch (error) {
      console.error('Invoice error:', error);
      toast({
        title: "Failed to Send Invoice",
        description: error instanceof Error ? error.message : "Failed to send invoice. Please try again.",
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
            Send Manual Invoice
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
                    <span className="font-medium">{booking.talent_profiles?.artist_name || 'You'}</span>
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

              {/* Price Input */}
              <div className="space-y-4">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                  Agreed Price
                </h3>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="price">Total Price</Label>
                    <Input
                      id="price"
                      type="number"
                      placeholder="1000"
                      value={agreedPrice}
                      onChange={(e) => setAgreedPrice(e.target.value)}
                      min="0"
                      step="0.01"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="currency">Currency</Label>
                    <Select value={currency} onValueChange={setCurrency}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="USD">USD ($)</SelectItem>
                        <SelectItem value="EUR">EUR (€)</SelectItem>
                        <SelectItem value="GBP">GBP (£)</SelectItem>
                        <SelectItem value="CAD">CAD ($)</SelectItem>
                        <SelectItem value="AUD">AUD ($)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {price > 0 && (
                <>
                  <Separator />
                  
                  {/* Commission Breakdown */}
                  <div>
                    <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                      <Calculator className="h-4 w-4" />
                      Payment Breakdown
                    </h3>
                    <div className="mt-2 space-y-2">
                      <div className="flex justify-between">
                        <span>Total Price:</span>
                        <span className="font-medium">{currency} {price.toFixed(2)}</span>
                      </div>
                      
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <span>Platform Commission ({platformCommissionRate}%):</span>
                        <span>-{currency} {platformCommission.toFixed(2)}</span>
                      </div>
                      
                      <Separator />
                      
                      <div className="flex justify-between items-center text-lg font-semibold text-green-600">
                        <span>Your Earnings:</span>
                        <span>{currency} {talentEarnings.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Demo Notice */}
              <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-md">
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  🎭 <strong>Demo Mode:</strong> This will send a mock invoice to the booker. 
                  The booker will see the total price you entered and can proceed with payment.
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
            onClick={handleSendInvoice} 
            disabled={isProcessing || !agreedPrice || price <= 0}
            className="min-w-32"
          >
            {isProcessing ? (
              <>
                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                Sending...
              </>
            ) : (
              <>
                <DollarSign className="h-4 w-4 mr-2" />
                Send Invoice
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};