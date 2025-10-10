import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Crown, Trash2, Shield, ShieldOff } from 'lucide-react';
import { ProBadge } from '@/components/ProBadge';

// Define a type for your user data
interface AppUser {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string;
  user_metadata: any;
  user_type: string;
  has_talent_profile: boolean;
  total_bookings: number;
}

const AdminUsers = () => {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [talents, setTalents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data: usersData, error: usersError } = await supabase.rpc('admin_get_all_users');
      if (usersError) throw usersError;
      
      const { data: talentsData, error: talentsError } = await supabase
        .from('talent_profiles')
        .select('id, user_id, artist_name, is_pro_subscriber, subscription_status, provider, manual_grant_expires_at');
      if (talentsError) throw talentsError;
      
      setUsers(usersData || []);
      setTalents(talentsData || []);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast({
        title: "Error",
        description: "Failed to fetch users",
        variant: "destructive"
      });
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const toggleProStatus = async (userId: string, talentId: string, isCurrentlyPro: boolean) => {
    setActionLoading(userId);
    try {
      const { data, error } = await supabase.rpc('admin_update_subscription', {
        talent_id_param: talentId,
        is_pro: !isCurrentlyPro
      });
      
      if (error) throw error;
      
      toast({
        title: "Success",
        description: `${!isCurrentlyPro ? 'Activated' : 'Deactivated'} Pro subscription`,
        variant: "default"
      });
      
      await fetchUsers();
    } catch (error) {
      console.error("Error updating Pro status:", error);
      toast({
        title: "Error",
        description: "Failed to update Pro status",
        variant: "destructive"
      });
    }
    setActionLoading(null);
  };

  const deleteUser = async (userId: string) => {
    setActionLoading(userId);
    try {
      const { data, error } = await supabase.rpc('admin_delete_user', {
        user_id_to_delete: userId
      });
      
      if (error) throw error;
      
      toast({
        title: "Success",
        description: "User deleted successfully",
        variant: "default"
      });
      
      await fetchUsers();
    } catch (error) {
      console.error("Error deleting user:", error);
      toast({
        title: "Error", 
        description: "Failed to delete user",
        variant: "destructive"
      });
    }
    setActionLoading(null);
  };

  if (loading) {
    return <div>Loading users...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>User Management</CardTitle>
        <CardDescription>View and manage all users on the platform.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead className="hidden sm:table-cell">Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="hidden md:table-cell">Bookings</TableHead>
                <TableHead className="hidden lg:table-cell">Signed Up</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => {
                const talent = talents.find(t => t.user_id === user.id);
                const isLoading = actionLoading === user.id;
                
                return (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium text-sm">{user.email}</TableCell>
                    <TableCell className="hidden sm:table-cell">{user.user_metadata?.name || 'N/A'}</TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <Badge variant="outline" className="capitalize text-xs">
                          {user.user_type}
                        </Badge>
                        {talent?.is_pro_subscriber && (
                          <ProBadge 
                            size="sm" 
                            className={talent.provider === 'manual' ? 'bg-gradient-to-br from-blue-400 via-blue-500 to-blue-600 border-blue-300/50' : ''}
                            showIcon={true}
                          />
                        )}
                        {talent?.provider === 'manual' && talent?.is_pro_subscriber && (
                          <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-600 border-blue-500/20">
                            Admin Grant
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">{user.total_bookings}</TableCell>
                    <TableCell className="hidden lg:table-cell text-sm">{format(new Date(user.created_at), 'MMM dd, yyyy')}</TableCell>
                    <TableCell>
                      <div className="flex flex-col sm:flex-row gap-1">
                        {talent && (
                          <Button
                            variant={talent.is_pro_subscriber ? "destructive" : "default"}
                            size="sm"
                            disabled={isLoading}
                            onClick={() => toggleProStatus(user.id, talent.id, talent.is_pro_subscriber)}
                            className="text-xs"
                          >
                            {isLoading ? (
                              <div className="h-3 w-3 animate-spin rounded-full border-2 border-current border-r-transparent" />
                            ) : talent.is_pro_subscriber ? (
                              <><ShieldOff className="h-3 w-3 mr-1" />Remove Pro</>
                            ) : (
                              <><Crown className="h-3 w-3 mr-1" />Make Pro</>
                            )}
                          </Button>
                        )}
                        
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="sm" disabled={isLoading} className="text-xs">
                              <Trash2 className="h-3 w-3 mr-1" />
                              Delete
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete User</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete {user.email}? This action cannot be undone and will remove all their data.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteUser(user.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Delete User
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default AdminUsers;