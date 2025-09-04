import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Users, Calendar, DollarSign, MessageSquare, Settings, Shield, BarChart3, FileText } from 'lucide-react';
import { useAdminAuth } from '@/hooks/useAdminAuth';

interface DashboardStats {
  totalUsers: number;
  totalTalents: number;
  totalBookings: number;
  pendingBookings: number;
  activeChats: number;
  proSubscribers: number;
}

export default function AdminDashboard() {
  const { adminPermissions } = useAdminAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    totalTalents: 0,
    totalBookings: 0,
    pendingBookings: 0,
    activeChats: 0,
    proSubscribers: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardStats();
  }, []);

  const loadDashboardStats = async () => {
    try {
      const [usersData, talentsData, bookingsData, chatData] = await Promise.all([
        supabase.rpc('admin_get_all_users'),
        supabase.from('talent_profiles').select('id, is_pro_subscriber'),
        supabase.from('bookings').select('id, status'),
        supabase.from('chat_messages').select('booking_id').limit(1000),
      ]);

      const pendingBookings = bookingsData.data?.filter(b => b.status === 'pending').length || 0;
      const uniqueChats = new Set(chatData?.data?.map(c => c.booking_id)).size;
      const proSubscribers = talentsData.data?.filter(t => t.is_pro_subscriber).length || 0;

      setStats({
        totalUsers: usersData.data?.length || 0,
        totalTalents: talentsData.data?.length || 0,
        totalBookings: bookingsData.data?.length || 0,
        pendingBookings,
        activeChats: uniqueChats,
        proSubscribers,
      });
    } catch (error) {
      console.error('Error loading dashboard stats:', error);
      // Fallback to basic stats if admin function fails
      try {
        const [talentsData, bookingsData] = await Promise.all([
          supabase.from('talent_profiles').select('id, is_pro_subscriber'),
          supabase.from('bookings').select('id, status'),
        ]);
        
        setStats({
          totalUsers: 0, // Can't get user count without admin access
          totalTalents: talentsData.data?.length || 0,
          totalBookings: bookingsData.data?.length || 0,
          pendingBookings: bookingsData.data?.filter(b => b.status === 'pending').length || 0,
          activeChats: 0,
          proSubscribers: talentsData.data?.filter(t => t.is_pro_subscriber).length || 0,
        });
      } catch (fallbackError) {
        console.error('Error loading fallback stats:', fallbackError);
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-32 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b">
        <div className="flex h-16 items-center px-6">
          <Shield className="h-6 w-6 mr-2" />
          <h1 className="text-xl font-semibold">Admin Dashboard</h1>
          <div className="ml-auto flex items-center space-x-2">
            <Badge variant="secondary">
              Permissions: {adminPermissions.includes('all') ? 'Full Access' : adminPermissions.join(', ')}
            </Badge>
          </div>
        </div>
      </div>

      <div className="p-4 sm:p-6">
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 mb-6 sm:mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalUsers}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Talents</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalTalents}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalBookings}</div>
              <p className="text-xs text-muted-foreground">
                {stats.pendingBookings} pending
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pro Subscribers</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.proSubscribers}</div>
              <p className="text-xs text-muted-foreground">
                Active subscriptions
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Users className="h-5 w-5 mr-2" />
                Users & Talents
              </CardTitle>
              <CardDescription>Manage users, talents, and Pro subscriptions</CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => navigate('/admin/users')}
              >
                <Users className="h-4 w-4 mr-2" />
                Manage All Users
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Calendar className="h-5 w-5 mr-2" />
                Bookings
              </CardTitle>
              <CardDescription>Oversee all bookings and statuses</CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => navigate('/admin/bookings')}
              >
                <Calendar className="h-4 w-4 mr-2" />
                View All Bookings
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <MessageSquare className="h-5 w-5 mr-2" />
                Chat Messages
              </CardTitle>
              <CardDescription>Monitor chats and send broadcasts</CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => navigate('/admin/messages')}
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                Message Center
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileText className="h-5 w-5 mr-2" />
                Direct Inbox
              </CardTitle>
              <CardDescription>Handle direct booking requests</CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => navigate('/admin/event-requests')}
              >
                <FileText className="h-4 w-4 mr-2" />
                Event Requests
                {stats.pendingBookings > 0 && (
                  <Badge variant="destructive" className="ml-auto">
                    {stats.pendingBookings}
                  </Badge>
                )}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <DollarSign className="h-5 w-5 mr-2" />
                Pro Subscriptions
              </CardTitle>
              <CardDescription>Monitor Pro subscription metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => navigate('/admin/payments')}
              >
                <DollarSign className="h-4 w-4 mr-2" />
                View Subscriptions
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Settings className="h-5 w-5 mr-2" />
                Settings
              </CardTitle>
              <CardDescription>Configure platform settings</CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => navigate('/admin/settings')}
              >
                <Settings className="h-4 w-4 mr-2" />
                Platform Settings
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}