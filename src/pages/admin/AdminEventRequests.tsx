import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Clock, MapPin, User, Mail, FileText, Eye, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface EventRequest {
  id: string;
  user_id: string;
  booker_name: string;
  booker_email: string;
  event_date: string;
  event_duration: number;
  event_location: string;
  event_type: string;
  description: string | null;
  status: 'pending' | 'approved' | 'declined' | 'completed';
  created_at: string;
  updated_at: string;
}

export default function AdminEventRequests() {
  const [requests, setRequests] = useState<EventRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<EventRequest | null>(null);

  useEffect(() => {
    loadEventRequests();
  }, []);

  const loadEventRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('event_requests')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setRequests((data || []).map(item => ({
        ...item,
        status: item.status as EventRequest['status']
      })));
    } catch (error) {
      console.error('Error loading event requests:', error);
      toast.error('Failed to load event requests');
    } finally {
      setLoading(false);
    }
  };

  const updateRequestStatus = async (requestId: string, status: EventRequest['status']) => {
    try {
      const { error } = await supabase
        .from('event_requests')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', requestId);
      
      if (error) throw error;
      
      // Update local state
      setRequests(prev => prev.map(req => 
        req.id === requestId ? { ...req, status } : req
      ));
      
      toast.success(`Request ${status} successfully`);
    } catch (error) {
      console.error('Error updating request status:', error);
      toast.error('Failed to update request status');
    }
  };

  const getStatusBadge = (status: EventRequest['status']) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-600 border-yellow-200"><AlertCircle className="h-3 w-3 mr-1" />Pending</Badge>;
      case 'approved':
        return <Badge variant="outline" className="bg-green-50 text-green-600 border-green-200"><CheckCircle className="h-3 w-3 mr-1" />Approved</Badge>;
      case 'declined':
        return <Badge variant="outline" className="bg-red-50 text-red-600 border-red-200"><XCircle className="h-3 w-3 mr-1" />Declined</Badge>;
      case 'completed':
        return <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-200"><CheckCircle className="h-3 w-3 mr-1" />Completed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPendingCount = () => requests.filter(req => req.status === 'pending').length;

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
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold mb-2">Event Requests</h1>
          <p className="text-muted-foreground">
            Manage event requests submitted through "Tell us about your event"
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          {getPendingCount() > 0 && (
            <Badge variant="outline" className="bg-yellow-50 text-yellow-600 border-yellow-200">
              {getPendingCount()} Pending
            </Badge>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{requests.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <AlertCircle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {requests.filter(r => r.status === 'pending').length}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {requests.filter(r => r.status === 'approved').length}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {requests.filter(r => {
                const requestDate = new Date(r.created_at);
                const now = new Date();
                return requestDate.getMonth() === now.getMonth() && 
                       requestDate.getFullYear() === now.getFullYear();
              }).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Requests Table */}
      <Card>
        <CardHeader>
          <CardTitle>Event Requests</CardTitle>
          <CardDescription>
            All event requests submitted by users looking for talent recommendations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Booker</TableHead>
                  <TableHead>Event Details</TableHead>
                  <TableHead>Date & Duration</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{request.booker_name}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Mail className="h-3 w-3" />
                          <span>{request.booker_email}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-medium capitalize">{request.event_type}</div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <MapPin className="h-3 w-3" />
                          <span>{request.event_location}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span>{format(new Date(request.event_date), 'MMM dd, yyyy')}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <span>{request.event_duration} hours</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(request.status)}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {format(new Date(request.created_at), 'MMM dd, HH:mm')}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => setSelectedRequest(request)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="sm:max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>Event Request Details</DialogTitle>
                              <DialogDescription>
                                Full details for {request.booker_name}&apos;s event request
                              </DialogDescription>
                            </DialogHeader>
                            {selectedRequest && (
                              <div className="space-y-6">
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <h3 className="font-semibold mb-2">Booker Information</h3>
                                    <div className="space-y-2 text-sm">
                                      <div><strong>Name:</strong> {selectedRequest.booker_name}</div>
                                      <div><strong>Email:</strong> {selectedRequest.booker_email}</div>
                                    </div>
                                  </div>
                                  <div>
                                    <h3 className="font-semibold mb-2">Event Information</h3>
                                    <div className="space-y-2 text-sm">
                                      <div><strong>Type:</strong> {selectedRequest.event_type}</div>
                                      <div><strong>Location:</strong> {selectedRequest.event_location}</div>
                                      <div><strong>Date:</strong> {format(new Date(selectedRequest.event_date), 'PPP')}</div>
                                      <div><strong>Duration:</strong> {selectedRequest.event_duration} hours</div>
                                    </div>
                                  </div>
                                </div>
                                
                                {selectedRequest.description && (
                                  <div>
                                    <h3 className="font-semibold mb-2">Description</h3>
                                    <p className="text-sm text-muted-foreground bg-muted p-3 rounded">
                                      {selectedRequest.description}
                                    </p>
                                  </div>
                                )}
                                
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium">Status:</span>
                                  <Select
                                    value={selectedRequest.status}
                                    onValueChange={(value: EventRequest['status']) => {
                                      updateRequestStatus(selectedRequest.id, value);
                                      setSelectedRequest({ ...selectedRequest, status: value });
                                    }}
                                  >
                                    <SelectTrigger className="w-40">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="pending">Pending</SelectItem>
                                      <SelectItem value="approved">Approved</SelectItem>
                                      <SelectItem value="declined">Declined</SelectItem>
                                      <SelectItem value="completed">Completed</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                            )}
                          </DialogContent>
                        </Dialog>
                        
                        {request.status === 'pending' && (
                          <div className="flex gap-1">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => updateRequestStatus(request.id, 'approved')}
                              className="text-green-600 hover:text-green-700"
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => updateRequestStatus(request.id, 'declined')}
                              className="text-red-600 hover:text-red-700"
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            
            {requests.length === 0 && (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Event Requests</h3>
                <p className="text-muted-foreground">
                  Event requests will appear here when users submit them through the website.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}