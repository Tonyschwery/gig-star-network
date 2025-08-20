import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, Clock, MapPin, User, Crown, DollarSign, Loader2 } from "lucide-react";
import { format } from "date-fns";

const CURRENCIES = [
  { value: 'USD', label: 'USD ($)' },
  { value: 'EUR', label: 'EUR (€)' },
  { value: 'GBP', label: 'GBP (£)' },
  { value: 'CAD', label: 'CAD (C$)' },
  { value: 'AUD', label: 'AUD (A$)' },
];

interface Booking {
  id: string;
  booker_name: string;
  booker_email: string;
  event_date: string;
  event_duration: number;
  event_location: string;
  event_address: string;
  event_type: string;
  description?: string;
  user_id: string;
  is_gig_opportunity?: boolean;
  is_public_request?: boolean;
}

interface ManualInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: Booking;
  isProSubscriber: boolean;
  onSuccess: () => void;
  gigApplicationId?: string; // Optional for gig applications
}

export function ManualInvoiceModal({ 
  isOpen, 
  onClose, 
  booking, 
  isProSubscriber,
  onSuccess,
  gigApplicationId
}: ManualInvoiceModalProps) {
  const [agreedPrice, setAgreedPrice] = useState<string>('');
  const [currency, setCurrency] = useState<string>('USD');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const price = parseFloat(agreedPrice) || 0;
  const platformCommissionRate = isProSubscriber ? 0 : 20;
  const platformCommission = (price * platformCommissionRate) / 100;
  const talentEarnings = price - platformCommission;

  const handleSendInvoice = async () => {
    if (!agreedPrice || price <= 0) {
      toast({
        title: "Error",
        description: "Please enter a valid price",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // Call the secure create-invoice Edge Function
      const { data, error } = await supabase.functions.invoke('create-invoice', {
        body: {
          id: booking.id,
          total_amount: price,
          currency: currency,
          platform_commission: platformCommission,
          talent_earnings: talentEarnings,
          commission_rate: platformCommissionRate,
          hourly_rate: price / booking.event_duration,
          hours_booked: booking.event_duration,
          // Keep for backward compatibility
          booking_id: booking.id
        }
      });

      if (error) {
        console.error('Edge function error:', error);
        throw new Error(error.message || 'Failed to create invoice');
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Failed to create invoice');
      }

      toast({
        title: "Success",
        description: "Invoice sent successfully to the booker!",
      });

      // Reset form
      setAgreedPrice('');
      setCurrency('USD');
      
      onSuccess();
    } catch (error) {
      console.error('Error sending invoice:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to send invoice. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getEventTypeIcon = (type: string) => {
    const icons: Record<string, string> = {
      wedding: "💒",
      birthday: "🎂",
      corporate: "🏢",
      opening: "🎪",
      club: "🎵",
      school: "🏫",
      festival: "🎉"
    };
    return icons[type] || "🎵";
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Send Invoice
          </DialogTitle>
          <DialogDescription>
            Set your price and send an invoice to the booker
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Booking Details */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-2xl">{getEventTypeIcon(booking.event_type)}</span>
                <div>
                  <h3 className="font-semibold text-lg capitalize">
                    {booking.event_type} Event
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Booking Request Details
                  </p>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span>{booking.booker_name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>{format(new Date(booking.event_date), 'PPP')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>{booking.event_duration} hours</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>{booking.event_location}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Pricing Form */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="price">Total Price</Label>
                <Input
                  id="price"
                  type="number"
                  placeholder="Enter amount"
                  value={agreedPrice}
                  onChange={(e) => setAgreedPrice(e.target.value)}
                  min="1"
                  step="0.01"
                />
              </div>
              <div>
                <Label htmlFor="currency">Currency</Label>
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((curr) => (
                      <SelectItem key={curr.value} value={curr.value}>
                        {curr.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Payment Breakdown */}
            {price > 0 && (
              <Card className="bg-muted/30">
                <CardContent className="p-4">
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    Payment Breakdown
                    {isProSubscriber && (
                      <Badge className="pro-badge">
                        <Crown className="h-3 w-3 mr-1" />
                        PRO
                      </Badge>
                    )}
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Total Amount:</span>
                      <span className="font-medium">{price.toFixed(2)} {currency}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Platform Commission ({platformCommissionRate}%):</span>
                      <span className="text-red-600">-{platformCommission.toFixed(2)} {currency}</span>
                    </div>
                    <div className="flex justify-between border-t pt-2 font-medium">
                      <span>Your Earnings:</span>
                      <span className="text-green-600">{talentEarnings.toFixed(2)} {currency}</span>
                    </div>
                  </div>
                  {!isProSubscriber && (
                    <div className="mt-3 p-2 bg-yellow-50 rounded text-xs text-yellow-700">
                      💡 Pro subscribers pay 0% commission (you're paying 20%)
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button 
              onClick={handleSendInvoice} 
              disabled={loading || !agreedPrice || price <= 0}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Send Invoice
            </Button>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            The booker will receive the invoice and can complete payment through their dashboard
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}