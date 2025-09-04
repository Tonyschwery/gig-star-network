import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { MessageSquare, Send, User, Search, Mail, Clock, Users } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

interface ChatUser {
  id: string;
  email: string;
  user_type: string;
  has_talent_profile: boolean;
  last_message?: string;
  last_message_at?: string;
  unread_count: number;
}

interface Message {
  id: string;
  content: string;
  created_at: string;
  sender_id: string;
  is_admin: boolean;
}

export default function AdminDirectMessages() {
  const [users, setUsers] = useState<ChatUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<ChatUser | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    if (selectedUser) {
      loadMessages(selectedUser.id);
    }
  }, [selectedUser]);

  const loadUsers = async () => {
    try {
      console.log('Loading users for admin chat...');
      const { data: allUsers, error } = await supabase.rpc('admin_get_all_users');
      
      if (error) {
        console.error('Error loading users:', error);
        throw error;
      }

      // Transform users and get their chat info
      const usersWithChatInfo: ChatUser[] = [];
      
      for (const user of allUsers || []) {
        // Get admin support booking for this user
        const { data: booking } = await supabase
          .from('bookings')
          .select('id')
          .eq('user_id', user.id)
          .eq('event_type', 'admin_support')
          .maybeSingle();

        if (booking) {
          // Get last message
          const { data: lastMessage } = await supabase
            .from('chat_messages')
            .select('content, created_at, sender_id')
            .eq('booking_id', booking.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          // Count unread messages (messages from user that admin hasn't seen)
          const { count: unreadCount } = await supabase
            .from('chat_messages')
            .select('*', { count: 'exact', head: true })
            .eq('booking_id', booking.id)
            .eq('sender_id', user.id);

          usersWithChatInfo.push({
            id: user.id,
            email: user.email,
            user_type: user.user_type,
            has_talent_profile: user.has_talent_profile,
            last_message: lastMessage?.content,
            last_message_at: lastMessage?.created_at,
            unread_count: unreadCount || 0
          });
        }
      }

      console.log('Loaded users with chat info:', usersWithChatInfo.length);
      setUsers(usersWithChatInfo);
    } catch (error: any) {
      console.error('Error loading users:', error);
      toast.error(`Failed to load users: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (userId: string) => {
    setMessagesLoading(true);
    try {
      // Get admin support booking for this user
      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .select('id')
        .eq('user_id', userId)
        .eq('event_type', 'admin_support')
        .maybeSingle();

      if (bookingError || !booking) {
        console.error('Error finding admin support booking:', bookingError);
        setMessages([]);
        return;
      }

      // Get all messages for this booking
      const { data: chatMessages, error: messagesError } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('booking_id', booking.id)
        .order('created_at', { ascending: true });

      if (messagesError) {
        console.error('Error loading messages:', messagesError);
        throw messagesError;
      }

      // Check which messages are from admin users
      const messagesWithAdminFlag: Message[] = [];
      for (const msg of chatMessages || []) {
        const { data: isAdminResult } = await supabase.rpc('is_admin', {
          user_id_param: msg.sender_id
        });
        
        messagesWithAdminFlag.push({
          ...msg,
          is_admin: !!isAdminResult
        });
      }

      setMessages(messagesWithAdminFlag);
    } catch (error: any) {
      console.error('Error loading messages:', error);
      toast.error(`Failed to load messages: ${error.message}`);
    } finally {
      setMessagesLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!selectedUser || !newMessage.trim()) return;

    setSending(true);
    try {
      console.log('Sending message to user:', selectedUser.id);
      await supabase.rpc('admin_send_direct_message', {
        target_user_id: selectedUser.id,
        message_content: newMessage.trim()
      });

      setNewMessage('');
      toast.success('Message sent successfully');
      
      // Reload messages to show the new one
      loadMessages(selectedUser.id);
      
      // Update the user's last message info
      loadUsers();
    } catch (error: any) {
      console.error('Error sending message:', error);
      toast.error(`Failed to send message: ${error.message}`);
    } finally {
      setSending(false);
    }
  };

  const filteredUsers = users.filter(user =>
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/4"></div>
          <div className="h-96 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Direct Messages</h1>
        <p className="text-muted-foreground">Manage direct conversations with platform users</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-200px)]">
        {/* Users List */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Users ({filteredUsers.length})
            </CardTitle>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[calc(100vh-350px)]">
              <div className="space-y-1 p-4">
                {filteredUsers.map((user) => (
                  <div
                    key={user.id}
                    onClick={() => setSelectedUser(user)}
                    className={`p-3 rounded-lg cursor-pointer transition-colors hover:bg-muted ${
                      selectedUser?.id === user.id ? 'bg-primary/10 border border-primary' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback>
                          {user.email.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="font-medium text-sm truncate">{user.email}</p>
                          {user.unread_count > 0 && (
                            <Badge variant="destructive" className="h-5 text-xs">
                              {user.unread_count}
                            </Badge>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-1 mt-1">
                          <Badge variant={user.has_talent_profile ? "default" : "secondary"} className="text-xs">
                            {user.has_talent_profile ? 'Talent' : 'Booker'}
                          </Badge>
                        </div>
                        
                        {user.last_message && (
                          <>
                            <p className="text-xs text-muted-foreground truncate mt-1">
                              {user.last_message}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {formatDistanceToNow(new Date(user.last_message_at!))} ago
                            </p>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Chat Area */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              {selectedUser ? `Chat with ${selectedUser.email}` : 'Select a user to start chatting'}
            </CardTitle>
            {selectedUser && (
              <CardDescription>
                {selectedUser.has_talent_profile ? 'Talent' : 'Booker'} • Direct support conversation
              </CardDescription>
            )}
          </CardHeader>
          
          {selectedUser ? (
            <CardContent className="flex flex-col h-[calc(100vh-400px)]">
              {/* Messages Area */}
              <ScrollArea className="flex-1 mb-4">
                {messagesLoading ? (
                  <div className="flex justify-center items-center h-32">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : (
                  <div className="space-y-4 p-2">
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${message.is_admin ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`max-w-[70%] p-3 rounded-lg ${
                          message.is_admin 
                            ? 'bg-primary text-primary-foreground ml-4' 
                            : 'bg-muted mr-4'
                        }`}>
                          <p className="text-sm">{message.content}</p>
                          <p className={`text-xs mt-1 ${
                            message.is_admin ? 'text-primary-foreground/70' : 'text-muted-foreground'
                          }`}>
                            {formatDistanceToNow(new Date(message.created_at))} ago
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>

              {/* Message Input */}
              <div className="flex gap-2">
                <Textarea
                  placeholder="Type your message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  rows={2}
                  className="flex-1 resize-none"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                />
                <Button 
                  onClick={sendMessage} 
                  disabled={!newMessage.trim() || sending}
                  size="sm"
                  className="self-end"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          ) : (
            <CardContent>
              <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                <MessageSquare className="h-16 w-16 mb-4" />
                <p className="text-lg font-medium mb-2">No conversation selected</p>
                <p className="text-sm text-center">Choose a user from the list to start or continue a conversation</p>
              </div>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
}