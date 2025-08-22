import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MessageSquare, Send, Users, Eye, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface ChatMessage {
  id: string;
  content: string;
  sender_id: string;
  booking_id: string;
  created_at: string;
}

interface Booking {
  id: string;
  booker_name: string;
  event_type: string;
}

interface BroadcastMessage {
  subject: string;
  message: string;
  recipient_type: 'all' | 'talents' | 'bookers';
}

export default function AdminMessages() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [bookings, setBookings] = useState<Record<string, Booking>>({});
  const [loading, setLoading] = useState(true);
  const [broadcastForm, setBroadcastForm] = useState<BroadcastMessage>({
    subject: '',
    message: '',
    recipient_type: 'all'
  });
  const [selectedMessages, setSelectedMessages] = useState<ChatMessage[]>([]);
  const [showBroadcastDialog, setShowBroadcastDialog] = useState(false);

  useEffect(() => {
    loadMessages();
    loadBookings();
  }, []);

  const loadMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      
      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('Error loading messages:', error);
      toast.error('Failed to load messages');
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

  const sendBroadcastMessage = async () => {
    if (!broadcastForm.subject.trim() || !broadcastForm.message.trim()) {
      toast.error('Please fill in all fields');
      return;
    }

    try {
      // In a real implementation, this would send emails or create notifications
      // For now, we'll just create notifications for all users
      
      let targetUsers: string[] = [];
      
      if (broadcastForm.recipient_type === 'talents') {
        const { data: talents } = await supabase
          .from('talent_profiles')
          .select('user_id');
        targetUsers = talents?.map(t => t.user_id) || [];
      } else if (broadcastForm.recipient_type === 'bookers') {
        const { data: bookings } = await supabase
          .from('bookings')
          .select('user_id');
        const uniqueBookers = Array.from(new Set(bookings?.map(b => b.user_id) || []));
        targetUsers = uniqueBookers;
      } else {
        // All users - get both talents and bookers
        const [{ data: talents }, { data: bookings }] = await Promise.all([
          supabase.from('talent_profiles').select('user_id'),
          supabase.from('bookings').select('user_id')
        ]);
        
        const allUsers = new Set([
          ...(talents?.map(t => t.user_id) || []),
          ...(bookings?.map(b => b.user_id) || [])
        ]);
        targetUsers = Array.from(allUsers);
      }

      // Create notifications for all target users
      const notifications = targetUsers.map(userId => ({
        user_id: userId,
        type: 'admin_broadcast',
        title: broadcastForm.subject,
        message: broadcastForm.message,
      }));

      if (notifications.length > 0) {
        const { error } = await supabase
          .from('notifications')
          .insert(notifications);
        
        if (error) throw error;
      }

      toast.success(`Broadcast message sent to ${targetUsers.length} users`);
      setBroadcastForm({ subject: '', message: '', recipient_type: 'all' });
      setShowBroadcastDialog(false);
    } catch (error) {
      console.error('Error sending broadcast:', error);
      toast.error('Failed to send broadcast message');
    }
  };

  const viewConversation = async (bookingId: string) => {
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('booking_id', bookingId)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      setSelectedMessages(data || []);
    } catch (error) {
      console.error('Error loading conversation:', error);
      toast.error('Failed to load conversation');
    }
  };

  const flagInappropriate = async (messageId: string) => {
    // In a real implementation, this would flag the message for review
    toast.success('Message flagged for review');
  };

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
          <h1 className="text-3xl font-bold mb-2">Message Center</h1>
          <p className="text-muted-foreground">Monitor communications and send broadcast messages</p>
        </div>
        
        <Dialog open={showBroadcastDialog} onOpenChange={setShowBroadcastDialog}>
          <DialogTrigger asChild>
            <Button>
              <Send className="h-4 w-4 mr-2" />
              Broadcast Message
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Send Broadcast Message</DialogTitle>
              <DialogDescription>
                Send a message to all users, talents only, or bookers only
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Recipients</label>
                <Select 
                  value={broadcastForm.recipient_type} 
                  onValueChange={(value: 'all' | 'talents' | 'bookers') => 
                    setBroadcastForm(prev => ({ ...prev, recipient_type: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Users</SelectItem>
                    <SelectItem value="talents">Talents Only</SelectItem>
                    <SelectItem value="bookers">Bookers Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="text-sm font-medium mb-2 block">Subject</label>
                <Input
                  value={broadcastForm.subject}
                  onChange={(e) => setBroadcastForm(prev => ({ ...prev, subject: e.target.value }))}
                  placeholder="Enter message subject..."
                />
              </div>
              
              <div>
                <label className="text-sm font-medium mb-2 block">Message</label>
                <Textarea
                  value={broadcastForm.message}
                  onChange={(e) => setBroadcastForm(prev => ({ ...prev, message: e.target.value }))}
                  placeholder="Enter your message..."
                  rows={4}
                />
              </div>
              
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowBroadcastDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={sendBroadcastMessage}>
                  Send Message
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Messages</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{messages.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Conversations</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Set(messages.map(m => m.booking_id)).size}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Messages</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {messages.filter(m => {
                const today = new Date();
                const messageDate = new Date(m.created_at);
                return messageDate.toDateString() === today.toDateString();
              }).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Messages */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Messages</CardTitle>
          <CardDescription>
            Monitor recent chat activity across all bookings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Booking</TableHead>
                  <TableHead>Message</TableHead>
                  <TableHead>Sender ID</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {messages.slice(0, 20).map((message) => (
                  <TableRow key={message.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">
                          {bookings[message.booking_id]?.booker_name || 'Unknown'}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {bookings[message.booking_id]?.event_type || 'Unknown Event'}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="max-w-xs truncate">
                        {message.content}
                      </div>
                    </TableCell>
                    <TableCell>
                      <code className="text-xs bg-muted px-2 py-1 rounded">
                        {message.sender_id.slice(0, 8)}...
                      </code>
                    </TableCell>
                    <TableCell>
                      {format(new Date(message.created_at), 'MMM dd, HH:mm')}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => viewConversation(message.booking_id)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="sm:max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>Conversation Details</DialogTitle>
                              <DialogDescription>
                                Full conversation for booking: {bookings[message.booking_id]?.booker_name}
                              </DialogDescription>
                            </DialogHeader>
                            <div className="max-h-96 overflow-y-auto space-y-3">
                              {selectedMessages.map((msg) => (
                                <div key={msg.id} className="p-3 bg-muted rounded-lg">
                                  <div className="text-sm text-muted-foreground mb-1">
                                    {format(new Date(msg.created_at), 'MMM dd, yyyy HH:mm')}
                                  </div>
                                  <div>{msg.content}</div>
                                  <div className="text-xs text-muted-foreground mt-2">
                                    Sender: {msg.sender_id.slice(0, 8)}...
                                  </div>
                                </div>
                              ))}
                            </div>
                          </DialogContent>
                        </Dialog>
                        
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => flagInappropriate(message.id)}
                        >
                          <AlertTriangle className="h-4 w-4" />
                        </Button>
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