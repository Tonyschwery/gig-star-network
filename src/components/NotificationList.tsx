import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Bell, Calendar, MessageCircle, Crown, X, CheckCheck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  booking_id: string | null;
  message_id: string | null;
  event_request_id: string | null;
  is_read: boolean;
  created_at: string;
}

export function NotificationList() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadNotifications();
      
      // Set up real-time subscription
      const channel = supabase
        .channel(`notifications-list-${user.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`
          },
          () => {
            loadNotifications();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  const loadNotifications = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      
      // Cast the data to match our interface (adding null checks)
      const typedNotifications: Notification[] = (data || []).map((item: any) => ({
        id: item.id,
        type: item.type,
        title: item.title,
        message: item.message,
        booking_id: item.booking_id,
        message_id: item.message_id,
        event_request_id: item.event_request_id ?? null,
        is_read: item.is_read,
        created_at: item.created_at,
      }));
      
      setNotifications(typedNotifications);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      if (error) throw error;

      setNotifications(prev => 
        prev.map(notif => 
          notif.id === notificationId 
            ? { ...notif, is_read: true }
            : notif
        )
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

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

  const deleteNotification = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);

      if (error) throw error;

      setNotifications(prev => 
        prev.filter(notif => notif.id !== notificationId)
      );
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    console.log('Notification clicked:', notification);
    
    // Mark as read
    if (!notification.is_read) {
      await markAsRead(notification.id);
    }

    // Navigate based on notification type and content
    if (notification.booking_id) {
      // Check if user is talent or booker for this booking
      try {
        const { data: booking } = await supabase
          .from('bookings')
          .select('talent_id, user_id')
          .eq('id', notification.booking_id)
          .maybeSingle();

        if (booking) {
          const { data: talentProfile } = await supabase
            .from('talent_profiles')
            .select('id')
            .eq('user_id', user?.id)
            .maybeSingle();

          const isTalent = talentProfile && booking.talent_id === talentProfile.id;
          
          if (isTalent) {
            navigate('/talent-dashboard');
          } else {
            navigate('/booker-dashboard');
          }
          
          // Open chat for the booking after navigation
          setTimeout(() => {
            // Use the chat system to open the booking chat
            const chatEvent = new CustomEvent('openChat', { 
              detail: { id: notification.booking_id, type: 'booking' }
            });
            window.dispatchEvent(chatEvent);
          }, 500);
        }
      } catch (error) {
        console.error('Error navigating to booking:', error);
        navigate('/booker-dashboard');
      }
    } else if (notification.event_request_id) {
      // Always go to booker dashboard for event requests (only bookers create them)
      navigate('/booker-dashboard');
      
      // Open chat for the event request after navigation
      setTimeout(() => {
        const chatEvent = new CustomEvent('openChat', { 
          detail: { id: notification.event_request_id, type: 'event_request' }
        });
        window.dispatchEvent(chatEvent);
      }, 500);
    } else if (notification.message_id) {
      // Navigate to chat - implementation depends on your chat structure
      navigate('/talent-dashboard');
    }
  };

  const getNotificationIcon = (type: string) => {
    if (type.includes('booking')) return <Calendar className="h-4 w-4" />;
    if (type.includes('message')) return <MessageCircle className="h-4 w-4" />;
    if (type.includes('pro')) return <Crown className="h-4 w-4" />;
    return <Bell className="h-4 w-4" />;
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  if (!user || loading) {
    return null;
  }

  if (notifications.length === 0) {
    return null;
  }

  return (
    <Card className="mb-6">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-lg">Recent Notifications</CardTitle>
            {unreadCount > 0 && (
              <Badge variant="destructive" className="text-xs">
                {unreadCount} new
              </Badge>
            )}
          </div>
          {unreadCount > 0 && (
            <Button
              onClick={markAllAsRead}
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-foreground"
            >
              <CheckCheck className="h-4 w-4 mr-1" />
              Mark all read
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-2">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className={`flex items-start gap-3 p-3 rounded-lg border transition-colors cursor-pointer hover:bg-muted/50 ${
                !notification.is_read 
                  ? 'bg-accent/10 border-accent/20' 
                  : 'bg-background border-border'
              }`}
              onClick={() => handleNotificationClick(notification)}
            >
              <div className={`flex-shrink-0 ${!notification.is_read ? 'text-accent' : 'text-muted-foreground'}`}>
                {getNotificationIcon(notification.type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className={`font-medium text-sm ${!notification.is_read ? 'text-foreground' : 'text-muted-foreground'}`}>
                      {notification.title}
                    </h4>
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                      {notification.message}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                    </p>
                  </div>
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteNotification(notification.id);
                    }}
                    variant="ghost"
                    size="sm"
                    className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0 hover:bg-destructive/10 hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              {!notification.is_read && (
                <div className="flex-shrink-0 w-2 h-2 bg-accent rounded-full mt-1"></div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}