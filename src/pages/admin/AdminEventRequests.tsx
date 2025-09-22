import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Calendar, Clock, MapPin, User, Mail, FileText, Eye, CheckCircle, XCircle, AlertCircle, Reply, Trash2, Send, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { useChat } from '@/contexts/ChatContext';

interface AdminEventRequest {
  id: string;
  user_id: string;
  booker_name: string;
  booker_email: string;
  booker_phone?: string | null;
  event_date: string;
  event_duration: number;
  event_location: string;
  event_type: string;
  description: string | null;
  talent_type_needed?: string | null;
  status: 'pending' | 'approved' | 'declined' | 'completed';
  created_at: string;
  updated_at: string;
  admin_reply?: string | null;
  replied_at?: string | null;
}

export default function AdminEventRequests() {
  const { openChat } = useChat();
  const [requests, setRequests] = useState<AdminEventRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<AdminEventRequest | null>(null);
  const [adminReply, setAdminReply] = useState('');

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
        status: item.status as AdminEventRequest['status']
      })));
    } catch (error) {
      console.error('Error loading event requests:', error);
      toast.error('Failed to load event requests');
    } finally {
      setLoading(false);
    }
  };

  const updateRequestStatus = async (requestId: string, status: AdminEventRequest['status'], adminReply?: string) => {
    try {
      const updateData: any = { 
        status,
        updated_at: new Date().toISOString()
      };
      
      // Add admin reply if provided
      if (adminReply !== undefined) {
        updateData.admin_reply = adminReply;
      }

      const { error } = await supabase
        .from('event_requests')
        .update(updateData)
        .eq('id', requestId);

      if (error) throw error;

      // Create notification for the user
      const request = requests.find(r => r.id === requestId);
      if (request) {
        await supabase
          .from('notifications')
          .insert({
            user_id: request.user_id,
            type: 'event_request_update',
            title: `Event Request ${status.charAt(0).toUpperCase() + status.slice(1)}`,
            message: adminReply 
              ? `Your event request has been ${status}. Response: ${adminReply}`
              : `Your event request has been ${status}.`,
            created_at: new Date().toISOString()
          });
      }

      // Reload requests to get updated data
      await loadEventRequests();

      toast.success(`Request ${status} successfully${adminReply ? ' with response' : ''}`);
    } catch (error) {
      console.error('Error updating request status:', error);
      toast.error('Failed to update request status');
    }
  };

  const deleteRequest = async (requestId: string) => {
    try {
      const { error } = await supabase
        .from('event_requests')
        .delete()
        .eq('id', requestId);
      
      if (error) throw error;
      
      // Update local state
      setRequests(prev => prev.filter(req => req.id !== requestId));
      
      toast.success('Request deleted successfully');
    } catch (error) {
      console.error('Error deleting request:', error);
      toast.error('Failed to delete request');
    }
  };

  const getStatusBadge = (status: AdminEventRequest['status']) => {
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
                        {request.booker_phone && (
                          <div className="flex items-center gap-2 text-sm font-medium text-primary">
                            <span className="text-xs bg-primary/10 px-2 py-1 rounded">📱 {request.booker_phone}</span>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-medium capitalize">{request.event_type}</div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <MapPin className="h-3 w-3" />
                          <span>{request.event_location}</span>
                        </div>
                        {request.talent_type_needed && (
                          <div className="flex items-center gap-2 text-sm font-medium text-blue-600">
                            <span className="text-xs bg-blue-50 px-2 py-1 rounded border border-blue-200">
                              Looking for: {request.talent_type_needed}
                            </span>
                          </div>
                        )}
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
                        <Button
                          onClick={() => openChat(request.id, 'event_request')}
                          variant="outline"
                          size="sm"
                        >
                          <MessageCircle className="h-4 w-4" />
                        </Button>
                        <Dialog>
                           <DialogTrigger asChild>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => {
                                  setSelectedRequest(request);
                                }}
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
                                       {selectedRequest.booker_phone && (
                                         <div><strong>Phone:</strong> 
                                           <span className="ml-2 bg-primary/10 px-2 py-1 rounded text-primary font-medium">
                                             {selectedRequest.booker_phone}
                                           </span>
                                         </div>
                                       )}
                                     </div>
                                  </div>
                                  <div>
                                    <h3 className="font-semibold mb-2">Event Information</h3>
                                     <div className="space-y-2 text-sm">
                                       <div><strong>Type:</strong> {selectedRequest.event_type}</div>
                                       <div><strong>Location:</strong> {selectedRequest.event_location}</div>
                                       <div><strong>Date:</strong> {format(new Date(selectedRequest.event_date), 'PPP')}</div>
                                       <div><strong>Duration:</strong> {selectedRequest.event_duration} hours</div>
                                       {selectedRequest.talent_type_needed && (
                                         <div><strong>Talent Needed:</strong> 
                                           <span className="ml-2 bg-blue-50 px-2 py-1 rounded text-blue-600 font-medium">
                                             {selectedRequest.talent_type_needed}
                                           </span>
                                         </div>
                                       )}
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
                                
                                  {/* Admin Reply Section */}
                                  <div className="border-t pt-4 space-y-4">
                                    <div className="flex items-center justify-between">
                                      <h3 className="font-semibold mb-2">Admin Response</h3>
                                      <Button
                                        onClick={() => openChat(selectedRequest.id, 'event_request')}
                                        variant="outline"
                                        size="sm"
                                      >
                                        <MessageCircle className="h-4 w-4 mr-2" />
                                        Open Chat
                                      </Button>
                                    </div>
                                   
                                   {selectedRequest.admin_reply ? (
                                     <div className="bg-green-50 border border-green-200 rounded p-3">
                                       <div className="flex items-center gap-2 mb-2">
                                         <Reply className="h-4 w-4 text-green-600" />
                                         <span className="font-medium text-green-800">Previous Response</span>
                                         {selectedRequest.replied_at && (
                                           <span className="text-xs text-green-600">
                                             {format(new Date(selectedRequest.replied_at), 'MMM dd, yyyy HH:mm')}
                                           </span>
                                         )}
                                       </div>
                                       <p className="text-sm text-green-700">{selectedRequest.admin_reply}</p>
                                     </div>
                                   ) : (
                                     <p className="text-sm text-muted-foreground">No response sent yet</p>
                                   )}
                                   
                                   <div className="space-y-3">
                                     <Textarea
                                       placeholder="Write a response to the user about their event request..."
                                       value={adminReply}
                                       onChange={(e) => setAdminReply(e.target.value)}
                                       rows={3}
                                       className="resize-none"
                                     />
                                     
                                     <div className="flex items-center gap-3">
                                       <div className="flex items-center gap-2">
                                         <span className="text-sm font-medium">Update Status:</span>
                                         <Select
                                           value={selectedRequest.status}
                                           onValueChange={(value: AdminEventRequest['status']) => {
                                             setSelectedRequest({ ...selectedRequest, status: value });
                                           }}
                                         >
                                           <SelectTrigger className="w-32">
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
                                       
                                       <Button
                                         onClick={() => {
                                           updateRequestStatus(
                                             selectedRequest.id,
                                             selectedRequest.status,
                                             adminReply || undefined
                                           );
                                           setAdminReply('');
                                         }}
                                         disabled={!adminReply.trim() && selectedRequest.status === requests.find(r => r.id === selectedRequest.id)?.status}
                                         size="sm"
                                         className="ml-auto"
                                       >
                                         <Send className="h-4 w-4 mr-2" />
                                         {adminReply.trim() ? 'Send Response' : 'Update Status'}
                                       </Button>
                                     </div>
                                     
                                     {adminReply.trim() && (
                                       <p className="text-xs text-muted-foreground">
                                         This response will be sent to the user via notification and will be visible in their event requests dashboard.
                                       </p>
                                     )}
                                   </div>
                                 </div>
                               </div>
                             )}
                           </DialogContent>
                         </Dialog>
                         
                         <AlertDialog>
                           <AlertDialogTrigger asChild>
                             <Button 
                               variant="outline" 
                               size="sm"
                               className="text-red-600 hover:text-red-700"
                             >
                               <Trash2 className="h-4 w-4" />
                             </Button>
                           </AlertDialogTrigger>
                           <AlertDialogContent>
                             <AlertDialogHeader>
                               <AlertDialogTitle>Delete Request</AlertDialogTitle>
                               <AlertDialogDescription>
                                 Are you sure you want to delete this event request? This action cannot be undone.
                               </AlertDialogDescription>
                             </AlertDialogHeader>
                             <AlertDialogFooter>
                               <AlertDialogCancel>Cancel</AlertDialogCancel>
                               <AlertDialogAction 
                                 onClick={() => deleteRequest(request.id)}
                                 className="bg-red-600 hover:bg-red-700"
                               >
                                 Delete
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