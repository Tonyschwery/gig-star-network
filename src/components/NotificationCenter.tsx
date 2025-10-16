// FILE: src/components/NotificationCenter.tsx

import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useChat } from '@/contexts/ChatContext';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

interface Notification {
  id: string;
  title: string;
  message: string;
  created_at: string;
  is_read: boolean;
  type: string;
  booking_id?: string;
  event_request_id?: string;
}

export function NotificationCenter() {
  const { user } = useAuth();
  const { openChat } = useChat();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const unreadCount = notifications.filter(n => !n.is_read).length;

  useEffect(() => {
    if (!user) {
      console.log('[NotificationCenter] No user, skipping fetch');
      return;
    }

    console.log('[NotificationCenter] 📋 Fetching notifications for user:', user.id);

    const fetchNotifications = async () => {
      try {
        const { data, error } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(10);
        
        if (error) {
          console.error('[NotificationCenter] ❌ Error fetching notifications:', error);
          toast({
            title: "Error Loading Notifications",
            description: error.message,
            variant: "destructive"
          });
        } else {
          console.log('[NotificationCenter] ✅ Fetched notifications:', data?.length || 0);
          setNotifications(data || []);
        }
      } catch (error) {
        console.error('[NotificationCenter] ❌ Unexpected error:', error);
      }
    };

    fetchNotifications();

    const subscription = supabase
      .channel(`notifications-for-${user.id}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'notifications', 
        filter: `user_id=eq.${user.id}` 
      }, (payload) => {
        console.log('[NotificationCenter] 🔄 Real-time update:', payload);
        fetchNotifications();
      })
      .subscribe((status) => {
        console.log('[NotificationCenter] Channel status:', status);
      });

    return () => { 
      console.log('[NotificationCenter] 🧹 Cleaning up subscription');
      supabase.removeChannel(subscription); 
    };
  }, [user, toast]);

  const markAllAsRead = async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false);

      if (error) throw error;

      setNotifications(prev => 
        prev.map(notif => ({ ...notif, is_read: true }))
      );

      toast({
        title: "All notifications marked as read",
        description: "You're all caught up!",
      });
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    console.log('Notification clicked:', notification);
    
    // Mark as read in the database
    await supabase.from('notifications').update({ is_read: true }).eq('id', notification.id);
    
    // Update state locally to immediately reflect the change
    setNotifications(prev => prev.map(n => n.id === notification.id ? { ...n, is_read: true } : n));
    
    // Handle navigation based on notification type
    if (notification.booking_id) {
      // Check user role to determine dashboard
      const { data: talentProfile } = await supabase
        .from('talent_profiles')
        .select('id')
        .eq('user_id', user?.id)
        .maybeSingle();
        
      if (talentProfile) {
        navigate('/talent-dashboard');
      } else {
        navigate('/booker-dashboard');
      }
      // Open chat for the booking
      setTimeout(() => {
        openChat(notification.booking_id!, 'booking');
      }, 500);
    } else if (notification.event_request_id) {
      // Always go to booker dashboard for event requests (only bookers create them)
      navigate('/booker-dashboard');
      // Open chat for the event request
      setTimeout(() => {
        openChat(notification.event_request_id!, 'event_request');
      }, 500);
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="icon" className="relative">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-xs text-white">
              {unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-medium leading-none">Notifications</h4>
            {notifications.length > 0 && (
              <Button
                onClick={markAllAsRead}
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground hover:text-foreground h-auto py-1 px-2"
                disabled={unreadCount === 0}
              >
                <CheckCheck className="h-3 w-3 mr-1" />
                Mark all read
              </Button>
            )}
          </div>
          {notifications.length === 0 ? (
            <p className="text-sm text-muted-foreground">No new notifications.</p>
          ) : (
            <div className="space-y-2">
              {notifications.map(n => (
                <div 
                  key={n.id}
                  onClick={() => handleNotificationClick(n)}
                  className={`p-2 rounded-md cursor-pointer transition-colors ${n.is_read ? 'hover:bg-muted/50' : 'bg-primary/10 hover:bg-primary/20'}`}
                >
                  <p className="text-sm font-medium">{n.message}</p>
                  <p className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}