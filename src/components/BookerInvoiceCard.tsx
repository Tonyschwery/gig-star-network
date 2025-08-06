import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  CreditCard, 
  Lock, 
  Calendar, 
  Clock, 
  MapPin, 
  User, 
  DollarSign,
  CheckCircle,
  X,
  Loader2
} from "lucide-react";
import { format } from "date-fns";

interface Payment {
  id: string;
  total_amount: number;
  platform_commission: number;
  talent_earnings: number;
  currency: string;
  payment_status: string;
  created_at: string;
}

interface Booking {
  id: string;
  booker_name: string;
  event_date: string;
  event_duration: number;
  event_location: string;
  event_address: string;
  event_type: string;
  description?: string;
  talent_profiles?: {
    artist_name: string;
  };
}

interface BookerInvoiceCardProps {
  booking: Booking;
  payment: Payment;
  onPaymentUpdate: () => void;
}

export function BookerInvoiceCard({ booking, payment, onPaymentUpdate }: BookerInvoiceCardProps) {
  const [showPayment, setShowPayment] = useState(false);
  const [cardNumber, setCardNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvv, setCvv] = useState('');
  const [cardName, setCardName] = useState('');
  const [processing, setProcessing] = useState(false);
  const { toast } = useToast();

  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = matches && matches[0] || '';
    const parts = [];
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    if (parts.length) {
      return parts.join(' ');
    } else {
      return v;
    }
  };

  const formatExpiryDate = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    if (v.length >= 2) {
      return v.substring(0, 2) + (v.length > 2 ? '/' + v.substring(2, 4) : '');
    }
    return v;
  };

  const handlePayment = async () => {
    if (!cardNumber || !expiryDate || !cvv || !cardName) {
      toast({
        title: "Error",
        description: "Please fill in all payment details",
        variant: "destructive",
      });
      return;
    }

    setProcessing(true);

    try {
      // Simulate payment processing delay
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Call the process-payment Edge Function
      const { data, error } = await supabase.functions.invoke('process-payment', {
        body: { 
          paymentId: payment.id,
          bookingId: booking.id,
          totalAmount: payment.total_amount
        },
        headers: {
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
      });

      if (error) throw error;

      toast({
        title: "Payment Successful!",
        description: "Your booking has been confirmed and the talent has been notified.",
      });

      onPaymentUpdate();
      setShowPayment(false);
      
      // Reset form
      setCardNumber('');
      setExpiryDate('');
      setCvv('');
      setCardName('');
    } catch (error) {
      console.error('Error processing payment:', error);
      toast({
        title: "Payment Failed",
        description: "Failed to process payment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleDeclineInvoice = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('decline-invoice', {
        body: { booking_id: booking.id },
        headers: {
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
      });

      if (error) throw error;

      toast({
        title: "Invoice Declined",
        description: "The invoice has been declined and the talent has been notified.",
      });

      onPaymentUpdate();
    } catch (error) {
      console.error('Error declining invoice:', error);
      toast({
        title: "Error",
        description: "Failed to decline invoice. Please try again.",
        variant: "destructive",
      });
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

  if (payment.payment_status === 'completed') {
    return (
      <Card className="border-green-200 bg-green-50/50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-green-700">
              <CheckCircle className="h-5 w-5" />
              Payment Completed
            </CardTitle>
            <Badge className="bg-green-100 text-green-700 border-green-200">
              Paid
            </Badge>
          </div>
          <CardDescription>
            Your booking has been confirmed and paid
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-green-600">
            <p>✅ Payment of {payment.total_amount} {payment.currency} processed successfully</p>
            <p>✅ Booking confirmed with {booking.talent_profiles?.artist_name}</p>
            <p>✅ Event date: {format(new Date(booking.event_date), 'PPP')}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (payment.payment_status === 'declined') {
    return (
      <Card className="border-red-200 bg-red-50/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-700">
            <X className="h-5 w-5" />
            Invoice Declined
          </CardTitle>
          <CardDescription>
            This invoice has been declined
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="border-blue-200">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Invoice from {booking.talent_profiles?.artist_name}
          </CardTitle>
          <Badge className="bg-blue-100 text-blue-700 border-blue-200">
            Payment Required
          </Badge>
        </div>
        <CardDescription>
          Review and pay for your {booking.event_type} event
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Event Details */}
        <div className="bg-muted/30 p-4 rounded-lg">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xl">{getEventTypeIcon(booking.event_type)}</span>
            <h4 className="font-semibold capitalize">{booking.event_type} Event</h4>
          </div>
          <div className="grid md:grid-cols-2 gap-2 text-sm">
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
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span>{booking.talent_profiles?.artist_name}</span>
            </div>
          </div>
        </div>

        {/* Payment Breakdown */}
        <div className="border rounded-lg p-4 bg-card">
          <h4 className="font-medium mb-3">Payment Breakdown</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Total Amount:</span>
              <span className="font-medium">{payment.total_amount} {payment.currency}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Platform Fee:</span>
              <span>{payment.platform_commission} {payment.currency}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Artist Earnings:</span>
              <span>{payment.talent_earnings} {payment.currency}</span>
            </div>
            <div className="border-t pt-2 flex justify-between font-medium">
              <span>You Pay:</span>
              <span className="text-lg">{payment.total_amount} {payment.currency}</span>
            </div>
          </div>
        </div>

        {/* Payment Interface */}
        {!showPayment ? (
          <div className="flex gap-3">
            <Button 
              onClick={() => setShowPayment(true)}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
            >
              <CreditCard className="h-4 w-4 mr-2" />
              Pay Now
            </Button>
            <Button 
              onClick={handleDeclineInvoice}
              variant="outline"
              className="border-red-200 text-red-600 hover:bg-red-50"
            >
              Decline Invoice
            </Button>
          </div>
        ) : (
          <div className="space-y-4 border-t pt-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Lock className="h-4 w-4" />
              <span>Secure Payment with Stripe (Demo Mode)</span>
            </div>

            <div className="grid gap-4">
              <div>
                <Label htmlFor="cardName">Cardholder Name</Label>
                <Input
                  id="cardName"
                  placeholder="John Doe"
                  value={cardName}
                  onChange={(e) => setCardName(e.target.value)}
                />
              </div>
              
              <div>
                <Label htmlFor="cardNumber">Card Number</Label>
                <Input
                  id="cardNumber"
                  placeholder="1234 5678 9012 3456"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                  maxLength={19}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="expiry">Expiry Date</Label>
                  <Input
                    id="expiry"
                    placeholder="MM/YY"
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(formatExpiryDate(e.target.value))}
                    maxLength={5}
                  />
                </div>
                <div>
                  <Label htmlFor="cvv">CVV</Label>
                  <Input
                    id="cvv"
                    placeholder="123"
                    value={cvv}
                    onChange={(e) => setCvv(e.target.value.replace(/\D/g, '').substring(0, 4))}
                    maxLength={4}
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <Button 
                onClick={handlePayment}
                disabled={processing}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white"
              >
                {processing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {processing ? 'Processing...' : `Pay ${payment.total_amount} ${payment.currency}`}
              </Button>
              <Button 
                onClick={() => setShowPayment(false)}
                variant="outline"
                disabled={processing}
              >
                Cancel
              </Button>
            </div>

            <p className="text-xs text-muted-foreground text-center">
              🔒 This is a demo payment interface. In production, this would connect to Stripe's secure payment processing.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}