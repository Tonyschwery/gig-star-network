import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DollarSign, Users, Calendar, TrendingUp, CreditCard } from "lucide-react";

export default function AdminPayments() {
  const [stats, setStats] = useState({
    activeSubscriptions: 0,
    monthlySubscriptions: 0,
    yearlySubscriptions: 0,
    newThisMonth: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSubscriptionStats();
  }, []);

  const loadSubscriptionStats = async () => {
    try {
      const { data: talents, error } = await supabase
        .from('talent_profiles')
        .select('is_pro_subscriber, subscription_started_at, plan_id')
        .eq('is_pro_subscriber', true);

      if (error) throw error;

      const activeSubscriptions = talents?.length || 0;
      const monthlySubscriptions = talents?.filter(t => t.plan_id?.includes('monthly')).length || 0;
      const yearlySubscriptions = talents?.filter(t => t.plan_id?.includes('yearly')).length || 0;
      
      const thisMonth = new Date();
      thisMonth.setDate(1);
      thisMonth.setHours(0, 0, 0, 0);
      
      const newThisMonth = talents?.filter(t => {
        return t.subscription_started_at && new Date(t.subscription_started_at) >= thisMonth;
      }).length || 0;

      setStats({
        activeSubscriptions,
        monthlySubscriptions,
        yearlySubscriptions,
        newThisMonth
      });
    } catch (error) {
      console.error('Error loading subscription stats:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Pro Subscriptions</h2>
        <p className="text-muted-foreground">
          Monitor Pro subscription metrics and revenue
        </p>
      </div>

      {/* Subscription Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Subscribers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeSubscriptions}</div>
            <p className="text-xs text-muted-foreground">Total Pro subscribers</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Plans</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.monthlySubscriptions}</div>
            <p className="text-xs text-muted-foreground">Monthly subscribers</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Yearly Plans</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.yearlySubscriptions}</div>
            <p className="text-xs text-muted-foreground">Yearly subscribers</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.newThisMonth}</div>
            <p className="text-xs text-muted-foreground">New subscribers</p>
          </CardContent>
        </Card>
      </div>

      {/* Pro Subscribers List */}
      <Card>
        <CardHeader>
          <CardTitle>Pro Subscribers</CardTitle>
          <CardDescription>
            All current Pro subscribers and their subscription details
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading subscription data...
            </div>
          ) : stats.activeSubscriptions === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No Pro subscribers yet. Users will appear here when they upgrade to Pro.
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              {stats.activeSubscriptions} Pro subscribers active
              <br />
              <small>Detailed subscriber list coming soon</small>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}