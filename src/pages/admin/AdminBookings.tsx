import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar, DollarSign, Trash2, CheckCircle, XCircle, Clock, MapPin, Archive } from 'lucide-react';
import { toast } from 'sonner';
import { format, isBefore, subDays } from 'date-fns';

interface Booking {
  id: string;
  booker_name: string;
  booker_email: string;
  event_type: string;
  event_date: string;
  event_location: string;
  status: string;
  budget: number;
  budget_currency: string;
  created_at: string;
  talent_id: string;
  description: string;
}

interface TalentProfile {
  id: string;
  artist_name: string;
}

export default function AdminBookings() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [talents, setTalents] = useState<Record<string, TalentProfile>>({});
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedBookingIds, setSelectedBookingIds] = useState<Set<string>>(new Set());
  const [bulkDeleteLoading, setBulkDeleteLoading] = useState(false);

  useEffect(() => {
    loadBookings();
    loadTalents();
  }, []);

  const loadBookings = async () => {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setBookings(data || []);
    } catch (error) {
      console.error('Error loading bookings:', error);
      toast.error('Failed to load bookings');
    } finally {
      setLoading(false);
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

  const updateBookingStatus = async (bookingId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ status: newStatus })
        .eq('id', bookingId);
      
      if (error) throw error;
      
      setBookings(bookings.map(b => 
        b.id === bookingId ? { ...b, status: newStatus } : b
      ));
      
      toast.success(`Booking status updated to ${newStatus}`);
    } catch (error) {
      console.error('Error updating booking status:', error);
      toast.error('Failed to update booking status');
    }
  };

  const deleteBooking = async (bookingId: string) => {
    try {
      const { error } = await supabase
        .from('bookings')
        .delete()
        .eq('id', bookingId);
      
      if (error) throw error;
      
      setBookings(bookings.filter(b => b.id !== bookingId));
      toast.success('Booking deleted successfully');
    } catch (error) {
      console.error('Error deleting booking:', error);
      toast.error('Failed to delete booking');
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      pending: { variant: 'secondary' as const, icon: Clock },
      approved: { variant: 'default' as const, icon: CheckCircle },
      declined: { variant: 'destructive' as const, icon: XCircle },
      completed: { variant: 'outline' as const, icon: CheckCircle },
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

  const toggleBookingSelection = (bookingId: string) => {
    const newSelected = new Set(selectedBookingIds);
    if (newSelected.has(bookingId)) {
      newSelected.delete(bookingId);
    } else {
      newSelected.add(bookingId);
    }
    setSelectedBookingIds(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedBookingIds.size === filteredBookings.length) {
      setSelectedBookingIds(new Set());
    } else {
      setSelectedBookingIds(new Set(filteredBookings.map(b => b.id)));
    }
  };

  const deleteSelectedBookings = async () => {
    if (selectedBookingIds.size === 0) {
      toast.error('No bookings selected');
      return;
    }

    setBulkDeleteLoading(true);
    try {
      const { error } = await supabase
        .from('bookings')
        .delete()
        .in('id', Array.from(selectedBookingIds));
      
      if (error) throw error;
      
      // Update local state
      setBookings(prev => prev.filter(b => !selectedBookingIds.has(b.id)));
      setSelectedBookingIds(new Set());
      
      toast.success(`${selectedBookingIds.size} bookings deleted successfully`);
    } catch (error) {
      console.error('Error deleting bookings:', error);
      toast.error('Failed to delete bookings');
    } finally {
      setBulkDeleteLoading(false);
    }
  };

  const deleteOldBookings = async (criteria: string) => {
    try {
      let query = supabase.from('bookings').select('id');
      
      if (criteria === 'cancelled_declined') {
        query = query.in('status', ['cancelled', 'declined']);
      } else if (criteria === 'completed_old') {
        const cutoffDate = subDays(new Date(), 90);
        query = query.eq('status', 'completed').lt('event_date', cutoffDate.toISOString());
      } else if (criteria === 'expired_pending') {
        const cutoffDate = subDays(new Date(), 30);
        query = query.eq('status', 'pending').lt('created_at', cutoffDate.toISOString());
      }
      
      const { data: oldBookings, error: fetchError } = await query;
      
      if (fetchError) throw fetchError;
      
      if (!oldBookings || oldBookings.length === 0) {
        toast.info('No bookings found matching the criteria');
        return;
      }

      const { error } = await supabase
        .from('bookings')
        .delete()
        .in('id', oldBookings.map(b => b.id));
      
      if (error) throw error;
      
      // Refresh bookings
      await loadBookings();
      
      toast.success(`${oldBookings.length} old bookings deleted successfully`);
    } catch (error) {
      console.error('Error deleting old bookings:', error);
      toast.error('Failed to delete old bookings');
    }
  };

  const filteredBookings = bookings.filter(booking => 
    statusFilter === 'all' || booking.status === statusFilter
  );

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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-2">Booking Management</h1>
          <p className="text-muted-foreground">Manage all platform bookings and their status</p>
        </div>
        
        <div className="flex items-center gap-2 flex-wrap">
          {selectedBookingIds.size > 0 && (
            <div className="flex items-center gap-2">
              <Badge variant="secondary">
                {selectedBookingIds.size} selected
              </Badge>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm" disabled={bulkDeleteLoading}>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Selected
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Selected Bookings</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete {selectedBookingIds.size} selected bookings? This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={deleteSelectedBookings} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                      Delete Bookings
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}
          
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Archive className="h-4 w-4 mr-2" />
                Clean Old Bookings
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Old Bookings</AlertDialogTitle>
                <AlertDialogDescription>
                  Choose which type of old bookings to clean up. This will help keep the database organized.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <div className="flex flex-col gap-2 my-4">
                <Button variant="outline" onClick={() => deleteOldBookings('cancelled_declined')}>
                  All Cancelled & Declined
                </Button>
                <Button variant="outline" onClick={() => deleteOldBookings('completed_old')}>
                  Completed (90+ days old)
                </Button>
                <Button variant="outline" onClick={() => deleteOldBookings('expired_pending')}>
                  Expired Pending (30+ days old)
                </Button>
              </div>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{bookings.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {bookings.filter(b => b.status === 'pending').length}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {bookings.filter(b => b.status === 'approved').length}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {bookings.filter(b => b.status === 'completed').length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <Card>
        <CardHeader>
          <CardTitle>Filter Bookings</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="declined">Declined</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Bookings Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Bookings ({filteredBookings.length})</CardTitle>
          <CardDescription>
            Manage booking status and details
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox 
                      checked={selectedBookingIds.size === filteredBookings.length && filteredBookings.length > 0}
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Booker</TableHead>
                  <TableHead>Event</TableHead>
                  <TableHead>Talent</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Budget</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBookings.map((booking) => (
                  <TableRow key={booking.id}>
                    <TableCell>
                      <Checkbox 
                        checked={selectedBookingIds.has(booking.id)}
                        onCheckedChange={() => toggleBookingSelection(booking.id)}
                      />
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{booking.booker_name}</div>
                        <div className="text-sm text-muted-foreground">{booking.booker_email}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{booking.event_type}</div>
                        <div className="text-sm text-muted-foreground flex items-center">
                          <MapPin className="h-3 w-3 mr-1" />
                          {booking.event_location}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {booking.talent_id ? 
                        talents[booking.talent_id]?.artist_name || 'Unknown' : 
                        'Not assigned'
                      }
                    </TableCell>
                    <TableCell>
                      {format(new Date(booking.event_date), 'MMM dd, yyyy')}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <DollarSign className="h-3 w-3 mr-1" />
                        {booking.budget} {booking.budget_currency}
                      </div>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(booking.status)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Select 
                          value={booking.status} 
                          onValueChange={(value) => updateBookingStatus(booking.id, value)}
                        >
                          <SelectTrigger className="h-8 w-28">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="approved">Approved</SelectItem>
                            <SelectItem value="declined">Declined</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                          </SelectContent>
                        </Select>
                        
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="sm">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Booking</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete this booking? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteBooking(booking.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Delete Booking
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
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