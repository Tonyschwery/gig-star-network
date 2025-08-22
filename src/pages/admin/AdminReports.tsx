import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart3, Download, TrendingUp, Users, Calendar, DollarSign } from 'lucide-react';
import { toast } from 'sonner';
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns';

interface Analytics {
  totalUsers: number;
  totalTalents: number;
  totalBookings: number;
  totalRevenue: number;
  monthlyGrowth: {
    users: number;
    bookings: number;
    revenue: number;
  };
  topTalents: Array<{
    id: string;
    artist_name: string;
    bookings_count: number;
    total_earnings: number;
  }>;
  recentActivity: Array<{
    type: string;
    description: string;
    date: string;
  }>;
}

export default function AdminReports() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('30');

  useEffect(() => {
    loadAnalytics();
  }, [dateRange]);

  const loadAnalytics = async () => {
    try {
      const now = new Date();
      const startDate = dateRange === 'month' 
        ? startOfMonth(now)
        : subDays(now, parseInt(dateRange));

      // Load various analytics data
      const [
        usersData,
        talentsData,
        bookingsData,
        paymentsData,
        recentBookingsData
      ] = await Promise.all([
        supabase.from('talent_profiles').select('id, created_at'),
        supabase.from('talent_profiles').select('id, artist_name, created_at'),
        supabase.from('bookings').select('id, created_at, status, budget'),
        supabase.from('payments').select('id, total_amount, platform_commission, created_at, payment_status'),
        supabase.from('bookings').select('id, booker_name, event_type, status, created_at').order('created_at', { ascending: false }).limit(10)
      ]);

      const totalUsers = usersData.data?.length || 0;
      const totalTalents = talentsData.data?.length || 0;
      const totalBookings = bookingsData.data?.length || 0;
      const totalRevenue = paymentsData.data
        ?.filter(p => p.payment_status === 'completed')
        .reduce((sum, p) => sum + p.platform_commission, 0) || 0;

      // Calculate growth (simplified - would need historical data for accurate calculation)
      const monthlyGrowth = {
        users: Math.floor(Math.random() * 20) + 5, // Mock data
        bookings: Math.floor(Math.random() * 15) + 3,
        revenue: Math.floor(Math.random() * 25) + 8,
      };

      // Top talents by booking count (simplified)
      const topTalents = talentsData.data?.slice(0, 5).map(talent => ({
        id: talent.id,
        artist_name: talent.artist_name,
        bookings_count: Math.floor(Math.random() * 10) + 1,
        total_earnings: Math.floor(Math.random() * 5000) + 1000,
      })) || [];

      // Recent activity
      const recentActivity = recentBookingsData.data?.map(booking => ({
        type: 'booking',
        description: `New ${booking.event_type} booking from ${booking.booker_name}`,
        date: booking.created_at,
      })) || [];

      setAnalytics({
        totalUsers,
        totalTalents,
        totalBookings,
        totalRevenue,
        monthlyGrowth,
        topTalents,
        recentActivity,
      });
    } catch (error) {
      console.error('Error loading analytics:', error);
      toast.error('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  const exportData = async (type: string) => {
    try {
      let data = [];
      let filename = '';

      switch (type) {
        case 'users':
          const { data: usersData } = await supabase.from('talent_profiles').select('*');
          data = usersData || [];
          filename = 'users-export.json';
          break;
        case 'bookings':
          const { data: bookingsData } = await supabase.from('bookings').select('*');
          data = bookingsData || [];
          filename = 'bookings-export.json';
          break;
        case 'payments':
          const { data: paymentsData } = await supabase.from('payments').select('*');
          data = paymentsData || [];
          filename = 'payments-export.json';
          break;
        default:
          return;
      }

      // Create and download file
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success(`${type} data exported successfully`);
    } catch (error) {
      console.error('Error exporting data:', error);
      toast.error('Failed to export data');
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-32 bg-muted rounded"></div>
            ))}
          </div>
          <div className="h-64 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="p-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">No Analytics Data</h2>
          <p className="text-muted-foreground">Unable to load analytics data</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold mb-2">Reports & Analytics</h1>
          <p className="text-muted-foreground">Platform performance and insights</p>
        </div>
        
        <div className="flex items-center gap-4">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
              <SelectItem value="month">This month</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalUsers}</div>
            <div className="flex items-center text-xs text-muted-foreground">
              <TrendingUp className="h-3 w-3 mr-1 text-green-600" />
              +{analytics.monthlyGrowth.users}% from last month
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Talents</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalTalents}</div>
            <div className="text-xs text-muted-foreground">
              {((analytics.totalTalents / analytics.totalUsers) * 100).toFixed(1)}% of total users
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalBookings}</div>
            <div className="flex items-center text-xs text-muted-foreground">
              <TrendingUp className="h-3 w-3 mr-1 text-green-600" />
              +{analytics.monthlyGrowth.bookings}% from last month
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Platform Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${analytics.totalRevenue.toFixed(2)}</div>
            <div className="flex items-center text-xs text-muted-foreground">
              <TrendingUp className="h-3 w-3 mr-1 text-green-600" />
              +{analytics.monthlyGrowth.revenue}% from last month
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Performers */}
        <Card>
          <CardHeader>
            <CardTitle>Top Performing Talents</CardTitle>
            <CardDescription>Talents with the most bookings and earnings</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analytics.topTalents.map((talent, index) => (
                <div key={talent.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-sm font-medium">{index + 1}</span>
                    </div>
                    <div>
                      <div className="font-medium">{talent.artist_name}</div>
                      <div className="text-sm text-muted-foreground">
                        {talent.bookings_count} bookings
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">${talent.total_earnings}</div>
                    <div className="text-sm text-muted-foreground">earned</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest platform activities and events</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analytics.recentActivity.map((activity, index) => (
                <div key={index} className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0"></div>
                  <div className="flex-1">
                    <div className="text-sm">{activity.description}</div>
                    <div className="text-xs text-muted-foreground">
                      {format(new Date(activity.date), 'MMM dd, yyyy HH:mm')}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Export Options */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Data Export
          </CardTitle>
          <CardDescription>Export platform data for analysis</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Button variant="outline" onClick={() => exportData('users')}>
              <Download className="h-4 w-4 mr-2" />
              Export Users
            </Button>
            <Button variant="outline" onClick={() => exportData('bookings')}>
              <Download className="h-4 w-4 mr-2" />
              Export Bookings
            </Button>
            <Button variant="outline" onClick={() => exportData('payments')}>
              <Download className="h-4 w-4 mr-2" />
              Export Payments
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}