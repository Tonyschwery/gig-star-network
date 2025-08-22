
import { useState, useEffect } from "react";
import { Bell, X, MessageCircle, CreditCard, CheckCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  booking_id: string | null;
  message_id: string | null;
  is_read: boolean;
  created_at: string;
}

export function NotificationCenter() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;

    loadNotifications();
    
    // Set up real-time subscription for new notifications
    const channel = supabase
      .channel('user-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          const newNotification = payload.new as Notification;
          setNotifications(prev => [newNotification, ...prev]);
          setUnreadCount(prev => prev + 1);
          
          // Show toast notification
          toast({
            title: newNotification.title,
            description: newNotification.message,
            action: (
              <Button variant="outline" size="sm">
                <MessageCircle className="h-4 w-4" />
              </Button>
            ),
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, toast]);

  const loadNotifications = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      
      setNotifications(data || []);
      setUnreadCount(data?.filter(n => !n.is_read).length || 0);
    } catch (error) {
      console.error('Error loading notifications:', error);
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
        prev.map(n => 
          n.id === notificationId ? { ...n, is_read: true } : n
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false);

      if (error) throw error;

      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all as read:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);

      if (error) throw error;

      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      setUnreadCount(prev => {
        const notification = notifications.find(n => n.id === notificationId);
        return notification && !notification.is_read ? prev - 1 : prev;
      });
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  // Get appropriate icon for notification type
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'new_message':
        return <MessageCircle className="h-4 w-4 text-blue-500" />;
      case 'invoice_received':
        return <CreditCard className="h-4 w-4 text-green-500" />;
      case 'payment_received':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'booking_approved':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'booking_declined':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'new_booking':
        return <CheckCircle className="h-4 w-4 text-blue-500" />;
      case 'admin_broadcast':
        return <AlertCircle className="h-4 w-4 text-orange-500" />;
      default:
        return <Bell className="h-4 w-4 text-muted-foreground" />;
    }
  };

  // Enhanced handleNotificationClick function with proper navigation
  const handleNotificationClick = async (notification: Notification) => {
    // Mark as read when clicked
    if (!notification.is_read) {
      await markAsRead(notification.id);
    }

    // Navigate based on notification type and user role
    try {
      // Check if user is a talent
      const { data: talentProfile } = await supabase
        .from('talent_profiles')
        .select('id')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (talentProfile) {
        // User is a talent
        if (notification.type === 'new_booking' && notification.booking_id) {
          // Navigate to talent bookings dashboard for new booking requests
          navigate('/talent-dashboard/bookings');
        } else if (notification.type === 'new_message' && notification.booking_id) {
          // Navigate to talent dashboard and open chat
          navigate('/talent-dashboard');
          setTimeout(() => {
            const chatButton = document.querySelector('[aria-label="Open chat"]') as HTMLElement;
            if (chatButton) {
              chatButton.click();
              setTimeout(() => {
                const selectTrigger = document.querySelector('[role="combobox"]') as HTMLElement;
                if (selectTrigger) {
                  selectTrigger.click();
                  setTimeout(() => {
                    const bookingOption = Array.from(document.querySelectorAll('[role="option"]')).find(
                      (option) => option.getAttribute('data-value') === notification.booking_id
                    ) as HTMLElement;
                    if (bookingOption) {
                      bookingOption.click();
                    }
                  }, 100);
                }
              }, 200);
            }
          }, 300);
        } else {
          // Default to talent dashboard
          navigate('/talent-dashboard');
        }
      } else {
        // User is a booker
        if (notification.booking_id) {
          if (notification.type === 'new_message') {
            // Navigate to booker dashboard and open chat
            navigate('/booker-dashboard');
            setTimeout(() => {
              const chatButton = document.querySelector('[aria-label="Open chat"]') as HTMLElement;
              if (chatButton) {
                chatButton.click();
                setTimeout(() => {
                  const selectTrigger = document.querySelector('[role="combobox"]') as HTMLElement;
                  if (selectTrigger) {
                    selectTrigger.click();
                    setTimeout(() => {
                      const bookingOption = Array.from(document.querySelectorAll('[role="option"]')).find(
                        (option) => option.getAttribute('data-value') === notification.booking_id
                      ) as HTMLElement;
                      if (bookingOption) {
                        bookingOption.click();
                      }
                    }, 100);
                  }
                }, 200);
              }
            }, 300);
          } else {
            // For other booking-related notifications, go to booker dashboard
            navigate('/booker-dashboard');
          }
        } else {
          // Default to booker dashboard
          navigate('/booker-dashboard');
        }
      }
    } catch (error) {
      console.error('Error determining user role:', error);
      // Default fallback
      navigate('/booker-dashboard');
    }
  };

  if (!user) return null;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 text-xs flex items-center justify-center"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      
      <PopoverContent className="w-80 p-0" align="end">
        <Card className="border-0 shadow-none">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Notifications</CardTitle>
              {unreadCount > 0 && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={markAllAsRead}
                  disabled={loading}
                >
                  Mark all read
                </Button>
              )}
            </div>
          </CardHeader>
          
          <CardContent className="p-0">
            <ScrollArea className="h-96">
              {notifications.length === 0 ? (
                <div className="p-6 text-center text-muted-foreground">
                  <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No notifications yet</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-4 border-b hover:bg-muted/50 transition-colors cursor-pointer ${
                        !notification.is_read ? 'bg-muted/30' : ''
                      }`}
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            {getNotificationIcon(notification.type)}
                            <p className="font-medium text-sm truncate">
                              {notification.title}
                            </p>
                            {!notification.is_read && (
                              <div className="h-2 w-2 bg-primary rounded-full" />
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">
                            {notification.message}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(notification.created_at), 'MMM d, h:mm a')}
                          </p>
                        </div>
                        
                        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                          {!notification.is_read && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => markAsRead(notification.id)}
                              className="h-6 w-6 p-0"
                            >
                              <Bell className="h-3 w-3" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteNotification(notification.id)}
                            className="h-6 w-6 p-0"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </PopoverContent>
    </Popover>
  );
}
