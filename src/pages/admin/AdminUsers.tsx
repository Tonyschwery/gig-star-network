import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Trash2, MessageSquare, User, Star, Calendar, Mail, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

interface AllUser {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
  user_metadata: any;
  user_type: string;
  has_talent_profile: boolean;
  total_bookings: number;
}

interface TalentProfile {
  id: string;
  artist_name: string;
  is_pro_subscriber: boolean;
  user_id: string;
}

export default function AdminUsers() {
  const { isAdmin, loading: adminLoading } = useAdminAuth();
  const [allUsers, setAllUsers] = useState<AllUser[]>([]);
  const [talents, setTalents] = useState<TalentProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [selectedTab, setSelectedTab] = useState('all-users');
  const [messageContent, setMessageContent] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);

  useEffect(() => {
    // Only load data when admin authentication is confirmed
    if (!adminLoading && isAdmin) {
      loadAllUsers();
      loadTalents();
    }
  }, [isAdmin, adminLoading]);

  const loadAllUsers = async () => {
    try {
      console.log('Loading all users via admin function...');
      
      const { data, error } = await supabase.rpc('admin_get_all_users');
      
      if (error) {
        console.error('Error loading all users:', error);
        toast.error(`Failed to load users: ${error.message}`);
        setAllUsers([]);
        return;
      }
      
      console.log('All users loaded successfully:', data?.length, 'users');
      
      // Process the data to ensure proper formatting
      const formattedUsers = data?.map(user => ({
        ...user,
        user_metadata: user.user_metadata || {},
        user_type: user.user_type || 'booker'
      })) || [];
      
      setAllUsers(formattedUsers);
      toast.success(`Successfully loaded ${formattedUsers.length} users`);
    } catch (error: any) {
      console.error('Error loading users:', error);
      toast.error(`Failed to load users: ${error.message}`);
      setAllUsers([]);
    }
  };

  const loadTalents = async () => {
    try {
      const { data, error } = await supabase
        .from('talent_profiles')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setTalents(data || []);
    } catch (error) {
      console.error('Error loading talents:', error);
      toast.error('Failed to load talents');
    } finally {
      setLoading(false);
    }
  };

  const deleteTalentProfile = async (talentId: string) => {
    try {
      const talentToDelete = talents.find(t => t.id === talentId);
      if (!talentToDelete) {
        toast.error('Talent profile not found');
        return;
      }

      const { data, error } = await supabase.rpc('admin_delete_user', {
        user_id_to_delete: talentToDelete.user_id
      });
      
      if (error) {
        console.error('RPC Error:', error);
        throw error;
      }
      
      const result = data as { success: boolean; error?: string; message?: string };
      if (result?.success) {
        setTalents(talents.filter(t => t.id !== talentId));
        setAllUsers(allUsers.filter(u => u.id !== talentToDelete.user_id));
        toast.success('User and talent profile deleted successfully');
      } else {
        throw new Error(result?.error || 'Failed to delete user');
      }
    } catch (error: any) {
      console.error('Error deleting user:', error);
      toast.error(`Failed to delete user: ${error.message || 'Unknown error'}`);
    }
  };

  const deleteUser = async (userId: string) => {
    try {
      const { data, error } = await supabase.rpc('admin_delete_user', {
        user_id_to_delete: userId
      });
      
      if (error) {
        console.error('RPC Error:', error);
        throw error;
      }
      
      const result = data as { success: boolean; error?: string; message?: string };
      if (result?.success) {
        setAllUsers(allUsers.filter(u => u.id !== userId));
        setTalents(talents.filter(t => t.user_id !== userId));
        toast.success('User deleted successfully');
      } else {
        throw new Error(result?.error || 'Failed to delete user');
      }
    } catch (error: any) {
      console.error('Error deleting user:', error);
      toast.error(`Failed to delete user: ${error.message || 'Unknown error'}`);
    }
  };

  const toggleProSubscription = async (talentId: string, currentStatus: boolean) => {
    try {
      const { data, error } = await supabase.rpc('admin_update_subscription', {
        talent_id_param: talentId,
        is_pro: !currentStatus
      });
      
      if (error) {
        console.error('RPC Error:', error);
        throw error;
      }
      
      const result = data as { success: boolean; error?: string; message?: string; is_pro?: boolean };
      if (result?.success) {
        setTalents(talents.map(t => 
          t.id === talentId 
            ? { ...t, is_pro_subscriber: !currentStatus }
            : t
        ));
        toast.success(`Pro subscription ${!currentStatus ? 'enabled' : 'disabled'} for talent`);
      } else {
        throw new Error(result?.error || 'Failed to update subscription');
      }
    } catch (error: any) {
      console.error('Error updating subscription:', error);
      toast.error(`Failed to update subscription: ${error.message || 'Unknown error'}`);
    }
  };

  const sendDirectMessage = async (userId: string, userEmail: string) => {
    if (!messageContent.trim()) {
      toast.error('Message content is required');
      return;
    }

    setSendingMessage(true);
    try {
      console.log('Sending direct message to user:', userId);
      const { data, error } = await supabase.rpc('admin_send_direct_message', {
        target_user_id: userId,
        message_content: messageContent.trim()
      });
      
      if (error) {
        console.error('Error sending message:', error);
        throw error;
      }
      
      console.log('Message sent successfully, message ID:', data);
      toast.success(`Message sent to ${userEmail}`);
      setMessageContent('');
    } catch (error: any) {
      console.error('Error sending direct message:', error);
      toast.error(`Failed to send message: ${error.message || 'Unknown error'}`);
    } finally {
      setSendingMessage(false);
    }
  };

  const filteredAllUsers = allUsers.filter(user => {
    const matchesSearch = user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.user_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.user_metadata?.name || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    let matchesFilter = false;
    switch (filterType) {
      case 'all':
        matchesFilter = true;
        break;
      case 'talent':
        matchesFilter = user.has_talent_profile;
        break;
      case 'booker':
        matchesFilter = !user.has_talent_profile;
        break;
      case 'pro':
        matchesFilter = user.has_talent_profile && talents.find(t => t.user_id === user.id)?.is_pro_subscriber;
        break;
      case 'free':
        matchesFilter = !user.has_talent_profile || !talents.find(t => t.user_id === user.id)?.is_pro_subscriber;
        break;
      default:
        matchesFilter = true;
    }
    
    return matchesSearch && matchesFilter;
  });

  const filteredTalents = talents.filter(talent => {
    const matchesSearch = talent.artist_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterType === 'all' || 
      (filterType === 'pro' && talent.is_pro_subscriber) ||
      (filterType === 'free' && !talent.is_pro_subscriber);
    
    return matchesSearch && matchesFilter;
  });

  if (loading || adminLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/4"></div>
          <div className="h-64 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-destructive mb-2">Access Denied</h1>
          <p className="text-muted-foreground">You don't have admin privileges to view this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">User Management</h1>
        <p className="text-muted-foreground">Manage all platform users, talent profiles, and direct messaging</p>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Search & Filter Users</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by email, name, or type..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Users</SelectItem>
                <SelectItem value="talent">Talents Only</SelectItem>
                <SelectItem value="booker">Bookers Only</SelectItem>
                <SelectItem value="pro">Pro Subscribers</SelectItem>
                <SelectItem value="free">Free Users</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* User Management Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="all-users">All Users ({filteredAllUsers.length})</TabsTrigger>
          <TabsTrigger value="talents-only">Talents Only ({filteredTalents.length})</TabsTrigger>
        </TabsList>

        {/* All Users Tab */}
        <TabsContent value="all-users">
          <Card>
            <CardHeader>
              <CardTitle>All Platform Users</CardTitle>
              <CardDescription>
                Complete list of all registered users (talents and bookers) with management options
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User Info</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Activity</TableHead>
                      <TableHead>Bookings</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAllUsers.map((user) => (
                      <TableRow key={user.id}>
                         <TableCell>
                           <div className="space-y-1">
                             <div className="flex items-center gap-2">
                               <Mail className="h-4 w-4 text-muted-foreground" />
                               <span className="font-medium">{user.email}</span>
                             </div>
                             {user.user_metadata?.name && (
                               <div className="text-sm text-muted-foreground">
                                 Name: {user.user_metadata.name}
                               </div>
                             )}
                             <div className="flex items-center gap-2 text-xs text-muted-foreground">
                               <Calendar className="h-3 w-3" />
                               <span>Joined {formatDistanceToNow(new Date(user.created_at))} ago</span>
                             </div>
                           </div>
                         </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <Badge variant={user.has_talent_profile ? "default" : "secondary"}>
                              {user.has_talent_profile ? 'Talent' : 'Booker'}
                            </Badge>
                            {user.has_talent_profile && (
                              <Badge variant={talents.find(t => t.user_id === user.id)?.is_pro_subscriber ? "default" : "outline"}>
                                {talents.find(t => t.user_id === user.id)?.is_pro_subscriber ? (
                                  <><Star className="h-3 w-3 mr-1" />Pro</>
                                ) : (
                                  'Free'
                                )}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1 text-sm">
                            {user.last_sign_in_at ? (
                              <div className="flex items-center gap-1 text-muted-foreground">
                                <Clock className="h-3 w-3" />
                                <span>Last seen {formatDistanceToNow(new Date(user.last_sign_in_at))} ago</span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">Never signed in</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {user.total_bookings} bookings
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {/* Direct Message Button */}
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button variant="outline" size="sm">
                                  <MessageSquare className="h-4 w-4 mr-1" />
                                  Message
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Send Direct Message</DialogTitle>
                                  <DialogDescription>
                                    Send a direct message to {user.email}. This will create a support chat that they can respond to.
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <Textarea
                                    placeholder="Enter your message..."
                                    value={messageContent}
                                    onChange={(e) => setMessageContent(e.target.value)}
                                    rows={4}
                                  />
                                  <div className="flex justify-end gap-2">
                                    <Button
                                      onClick={() => sendDirectMessage(user.id, user.email)}
                                      disabled={!messageContent.trim() || sendingMessage}
                                    >
                                      {sendingMessage ? 'Sending...' : 'Send Message'}
                                    </Button>
                                  </div>
                                </div>
                              </DialogContent>
                            </Dialog>
                            
                            {/* Delete User Button */}
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="destructive" size="sm">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete User Account</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete {user.email}? 
                                    This action cannot be undone and will remove all associated data including bookings, messages, and profiles.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => deleteUser(user.id)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Delete Account
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
        </TabsContent>

        {/* Talents Only Tab */}
        <TabsContent value="talents-only">
          <Card>
            <CardHeader>
              <CardTitle>Talent Profiles</CardTitle>
              <CardDescription>
                Manage talent profiles, subscriptions, and access
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Artist Name</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>User ID</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTalents.map((talent) => (
                      <TableRow key={talent.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            {talent.artist_name}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={talent.is_pro_subscriber ? "default" : "secondary"}>
                            {talent.is_pro_subscriber ? (
                              <><Star className="h-3 w-3 mr-1" />Pro</>
                            ) : (
                              <>Free</>
                            )}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <code className="text-xs bg-muted px-2 py-1 rounded">
                            {talent.user_id.slice(0, 8)}...
                          </code>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => toggleProSubscription(talent.id, talent.is_pro_subscriber)}
                            >
                              {talent.is_pro_subscriber ? 'Remove Pro' : 'Make Pro'}
                            </Button>
                            
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="destructive" size="sm">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Talent Profile</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete {talent.artist_name}'s profile? 
                                    This action cannot be undone and will remove all associated data.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => deleteTalentProfile(talent.id)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Delete Profile
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
        </TabsContent>
      </Tabs>
    </div>
  );
}