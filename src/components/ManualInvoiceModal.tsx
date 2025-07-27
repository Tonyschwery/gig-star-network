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

const CURRENCIES = [
  { value: 'USD', label: 'USD ($)' },
  { value: 'EUR', label: 'EUR (€)' },
  { value: 'GBP', label: 'GBP (£)' },
  { value: 'AED', label: 'AED (د.إ)' },
  { value: 'SAR', label: 'SAR (ر.س)' },
  { value: 'QAR', label: 'QAR (ر.ق)' },
  { value: 'KWD', label: 'KWD (د.ك)' },
  { value: 'BHD', label: 'BHD (.د.ب)' },
  { value: 'OMR', label: 'OMR (ر.ع.)' },
  { value: 'JOD', label: 'JOD (د.ا)' },
  { value: 'LBP', label: 'LBP (ل.ل)' },
  { value: 'EGP', label: 'EGP (ج.م)' },
  { value: 'CAD', label: 'CAD ($)' },
  { value: 'AUD', label: 'AUD ($)' },
  { value: 'CHF', label: 'CHF (₣)' },
  { value: 'JPY', label: 'JPY (¥)' },
  { value: 'CNY', label: 'CNY (¥)' },
  { value: 'INR', label: 'INR (₹)' },
  { value: 'SGD', label: 'SGD ($)' },
  { value: 'HKD', label: 'HKD ($)' },
  { value: 'NZD', label: 'NZD ($)' },
  { value: 'SEK', label: 'SEK (kr)' },
  { value: 'NOK', label: 'NOK (kr)' },
  { value: 'DKK', label: 'DKK (kr)' },
  { value: 'PLN', label: 'PLN (zł)' },
  { value: 'CZK', label: 'CZK (Kč)' },
  { value: 'HUF', label: 'HUF (Ft)' },
  { value: 'RON', label: 'RON (lei)' },
  { value: 'BGN', label: 'BGN (лв)' },
  { value: 'HRK', label: 'HRK (kn)' },
  { value: 'RUB', label: 'RUB (₽)' },
  { value: 'TRY', label: 'TRY (₺)' },
  { value: 'ILS', label: 'ILS (₪)' },
  { value: 'ZAR', label: 'ZAR (R)' },
  { value: 'MXN', label: 'MXN ($)' },
  { value: 'BRL', label: 'BRL (R$)' },
  { value: 'CLP', label: 'CLP ($)' },
  { value: 'COP', label: 'COP ($)' },
  { value: 'PEN', label: 'PEN (S/)' },
  { value: 'UYU', label: 'UYU ($)' },
  { value: 'ARS', label: 'ARS ($)' },
  { value: 'THB', label: 'THB (฿)' },
  { value: 'MYR', label: 'MYR (RM)' },
  { value: 'IDR', label: 'IDR (Rp)' },
  { value: 'PHP', label: 'PHP (₱)' },
  { value: 'VND', label: 'VND (₫)' },
  { value: 'KRW', label: 'KRW (₩)' },
  { value: 'TWD', label: 'TWD (NT$)' }
];

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
      is_pro_subscriber?: boolean;
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
  // Use 20% commission for non-pro subscribers, 15% for pro subscribers
  const isProSubscriber = booking.talent_profiles?.is_pro_subscriber ?? false;
  const platformCommissionRate = isProSubscriber ? 15 : 20;
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
      // Prepare invoice data with proper validation
      const invoiceData = {
        bookingId: booking.id,
        agreedPrice: Number(price),
        currency: currency || 'USD',
        platformCommissionRate: Number(platformCommissionRate)
      };

      console.log('Sending manual invoice:', invoiceData);

      const { data, error } = await supabase.functions.invoke('send-manual-invoice', {
        body: invoiceData
      });

      if (error) {
        throw error;
      }

      if (data.success) {
        toast({
          title: "Invoice sent successfully!",
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
                       <SelectContent className="max-h-[200px]">
                         {CURRENCIES.map((currency) => (
                           <SelectItem key={currency.value} value={currency.value}>
                             {currency.label}
                           </SelectItem>
                         ))}
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

              {/* Invoice Notice */}
              <div className="p-3 bg-green-50 dark:bg-green-950 rounded-md">
                <p className="text-sm text-green-700 dark:text-green-300">
                  💰 <strong>Manual Invoice:</strong> This will send an invoice to the booker. 
                  They will receive a notification and can complete payment to confirm the booking.
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