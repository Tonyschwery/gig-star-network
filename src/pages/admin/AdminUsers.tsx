import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Trash2, Ban, Shield, User, Star } from 'lucide-react';
import { toast } from 'sonner';

interface User {
  id: string;
  email: string;
  created_at: string;
  user_metadata: any;
  last_sign_in_at: string;
}

interface UserProfile {
  id: string;
  artist_name: string;
  is_pro_subscriber: boolean;
  user_id: string;
}

export default function AdminUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [talents, setTalents] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');

  useEffect(() => {
    loadUsers();
    loadTalents();
  }, []);

  const loadUsers = async () => {
    try {
      // Note: In a real app, you'd need a server-side endpoint to fetch auth.users
      // For now, we'll work with what we can access from the client
      const { data: adminUsers, error } = await supabase
        .from('admin_users')
        .select('user_id');
      
      if (error) throw error;
      
      // This is a simplified approach - in production you'd need proper user management
      console.log('Admin users loaded:', adminUsers);
    } catch (error) {
      console.error('Error loading users:', error);
      toast.error('Failed to load users');
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
      const { error } = await supabase
        .from('talent_profiles')
        .delete()
        .eq('id', talentId);
      
      if (error) throw error;
      
      setTalents(talents.filter(t => t.id !== talentId));
      toast.success('Talent profile deleted successfully');
    } catch (error) {
      console.error('Error deleting talent:', error);
      toast.error('Failed to delete talent profile');
    }
  };

  const toggleProSubscription = async (talentId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('talent_profiles')
        .update({ is_pro_subscriber: !currentStatus })
        .eq('id', talentId);
      
      if (error) throw error;
      
      setTalents(talents.map(t => 
        t.id === talentId 
          ? { ...t, is_pro_subscriber: !currentStatus }
          : t
      ));
      
      toast.success(`Pro subscription ${!currentStatus ? 'enabled' : 'disabled'} for talent`);
    } catch (error) {
      console.error('Error updating subscription:', error);
      toast.error('Failed to update subscription');
    }
  };

  const filteredTalents = talents.filter(talent => {
    const matchesSearch = talent.artist_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterType === 'all' || 
      (filterType === 'pro' && talent.is_pro_subscriber) ||
      (filterType === 'free' && !talent.is_pro_subscriber);
    
    return matchesSearch && matchesFilter;
  });

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
        <h1 className="text-3xl font-bold mb-2">User Management</h1>
        <p className="text-muted-foreground">Manage all platform users and talent profiles</p>
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
                placeholder="Search by artist name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Users</SelectItem>
                <SelectItem value="pro">Pro Subscribers</SelectItem>
                <SelectItem value="free">Free Users</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Talent Profiles */}
      <Card>
        <CardHeader>
          <CardTitle>Talent Profiles ({filteredTalents.length})</CardTitle>
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
    </div>
  );
}