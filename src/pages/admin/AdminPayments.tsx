import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DollarSign, CheckCircle, Clock, XCircle, CreditCard } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface Payment {
  id: string;
  booking_id: string;
  booker_id: string;
  talent_id: string;
  total_amount: number;
  platform_commission: number;
  talent_earnings: number;
  commission_rate: number;
  payment_status: string;
  payment_method: string;
  currency: string;
  created_at: string;
  processed_at: string;
}

interface Booking {
  id: string;
  booker_name: string;
  event_type: string;
}

interface TalentProfile {
  id: string;
  artist_name: string;
}

export default function AdminPayments() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [bookings, setBookings] = useState<Record<string, Booking>>({});
  const [talents, setTalents] = useState<Record<string, TalentProfile>>({});
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    loadPayments();
    loadBookings();
    loadTalents();
  }, []);

  const loadPayments = async () => {
    try {
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setPayments(data || []);
    } catch (error) {
      console.error('Error loading payments:', error);
      toast.error('Failed to load payments');
    } finally {
      setLoading(false);
    }
  };

  const loadBookings = async () => {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select('id, booker_name, event_type');
      
      if (error) throw error;
      
      const bookingsMap = (data || []).reduce((acc, booking) => {
        acc[booking.id] = booking;
        return acc;
      }, {} as Record<string, Booking>);
      
      setBookings(bookingsMap);
    } catch (error) {
      console.error('Error loading bookings:', error);
    }
  };

  const loadTalents = async () => {
    try {
      const { data, error } = await supabase
        .from('talent_profiles')
        .select('id, artist_name');
      
      if (error) throw error;
      
      const talentsMap = (data || []).reduce((acc, talent) => {
        acc[talent.id] = talent;
        return acc;
      }, {} as Record<string, TalentProfile>);
      
      setTalents(talentsMap);
    } catch (error) {
      console.error('Error loading talents:', error);
    }
  };

  const completeManualPayment = async (paymentId: string) => {
    try {
      const { data, error } = await supabase
        .rpc('complete_manual_payment', { payment_id_param: paymentId });
      
      if (error) throw error;
      
      // Reload payments to reflect the change
      loadPayments();
      toast.success('Payment completed successfully');
    } catch (error) {
      console.error('Error completing payment:', error);
      toast.error('Failed to complete payment');
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      pending: { variant: 'secondary' as const, icon: Clock },
      completed: { variant: 'default' as const, icon: CheckCircle },
      failed: { variant: 'destructive' as const, icon: XCircle },
      refunded: { variant: 'outline' as const, icon: CreditCard },
    };
    
    const config = variants[status as keyof typeof variants] || variants.pending;
    const Icon = config.icon;
    
    return (
      <Badge variant={config.variant}>
        <Icon className="h-3 w-3 mr-1" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const filteredPayments = payments.filter(payment => 
    statusFilter === 'all' || payment.payment_status === statusFilter
  );

  const totalRevenue = payments
    .filter(p => p.payment_status === 'completed')
    .reduce((sum, p) => sum + p.platform_commission, 0);

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/4"></div>
          <div className="h-64 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Payment Management</h1>
        <p className="text-muted-foreground">Monitor and manage all platform payments</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Payments</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{payments.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Platform Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalRevenue.toFixed(2)}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Payments</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {payments.filter(p => p.payment_status === 'pending').length}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed Today</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {payments.filter(p => {
                const today = new Date();
                const paymentDate = p.processed_at ? new Date(p.processed_at) : null;
                return paymentDate && 
                       paymentDate.toDateString() === today.toDateString() &&
                       p.payment_status === 'completed';
              }).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <Card>
        <CardHeader>
          <CardTitle>Filter Payments</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="refunded">Refunded</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Payments Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Payments ({filteredPayments.length})</CardTitle>
          <CardDescription>
            Monitor payment transactions and manage manual completions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Booking</TableHead>
                  <TableHead>Talent</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Commission</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPayments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">
                          {bookings[payment.booking_id]?.booker_name || 'Unknown'}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {bookings[payment.booking_id]?.event_type || 'Unknown Event'}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {talents[payment.talent_id]?.artist_name || 'Unknown'}
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">
                          ${payment.total_amount} {payment.currency}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Talent: ${payment.talent_earnings}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-green-600">
                        ${payment.platform_commission}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {(payment.commission_rate * 100).toFixed(1)}%
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {payment.payment_method.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(payment.payment_status)}
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="text-sm">
                          {format(new Date(payment.created_at), 'MMM dd, yyyy')}
                        </div>
                        {payment.processed_at && (
                          <div className="text-xs text-muted-foreground">
                            Processed: {format(new Date(payment.processed_at), 'MMM dd')}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {payment.payment_status === 'pending' && payment.payment_method === 'manual_invoice' && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm">
                              Complete Payment
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Complete Manual Payment</AlertDialogTitle>
                              <AlertDialogDescription>
                                Mark this manual payment as completed? This will update the booking status 
                                and send notifications to both parties.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => completeManualPayment(payment.id)}
                              >
                                Complete Payment
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}