// FILE: src/components/NotificationCenter.tsx

import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useChat } from '@/contexts/ChatContext';
import { useNavigate } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';

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
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const unreadCount = notifications.filter(n => !n.is_read).length;

  useEffect(() => {
    if (!user) return;

    const fetchNotifications = async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);
      if (error) console.error("Error fetching notifications:", error);
      else setNotifications(data || []);
    };

    fetchNotifications();

    const subscription = supabase
      .channel(`notifications-for-${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` }, fetchNotifications)
      .subscribe();

    return () => { supabase.removeChannel(subscription); };
  }, [user]);

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
        .single();
        
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
          <h4 className="font-medium leading-none mb-4">Notifications</h4>
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