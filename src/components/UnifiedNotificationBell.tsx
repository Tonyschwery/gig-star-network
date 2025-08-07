import { useState, useEffect, useRef } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

interface UnifiedNotificationBellProps {
  onClick?: () => void;
  className?: string;
}

export function UnifiedNotificationBell({ onClick, className }: UnifiedNotificationBellProps) {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // MASTER TASK 3: Initialize notification sound
  useEffect(() => {
    // Create a subtle notification sound using Web Audio API
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    const createNotificationSound = () => {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 800; // Pleasant frequency
      gainNode.gain.value = 0.1; // Low volume
      
      oscillator.start();
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
      oscillator.stop(audioContext.currentTime + 0.3);
    };

    audioRef.current = { play: createNotificationSound } as any;
  }, []);

  const fetchUnreadCount = async () => {
    if (!user) {
      setUnreadCount(0);
      setLoading(false);
      return;
    }

    try {
      // Get unread notifications count
      const { data: notifications, error: notifError } = await supabase
        .from('notifications')
        .select('id')
        .eq('user_id', user.id)
        .eq('is_read', false);

      if (notifError) throw notifError;

      // Get unread messages count using RPC function
      const { data: messageCount, error: msgError } = await supabase
        .rpc('get_unread_message_count', { user_id_param: user.id });

      if (msgError) throw msgError;

      const totalUnread = (notifications?.length || 0) + (messageCount || 0);
      setUnreadCount(totalUnread);
    } catch (error) {
      console.error('Error fetching unread counts:', error);
      setUnreadCount(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUnreadCount();
    
    if (!user) return;

    // MASTER TASK 3: Real-time subscription for all notifications and messages
    const channel = supabase
      .channel('unified-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('New notification received:', payload);
          fetchUnreadCount();
          
          // MASTER TASK 3: Play notification sound
          if (audioRef.current?.play) {
            try {
              audioRef.current.play();
            } catch (error) {
              console.log('Could not play notification sound:', error);
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          fetchUnreadCount();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages'
        },
        async (payload) => {
          // Check if this message is in a conversation the user participates in
          const newMessage = payload.new;
          if (newMessage.user_id !== user.id) { // Not from current user
            console.log('New message received from other user:', payload);
            fetchUnreadCount();
            
            // MASTER TASK 3: Play notification sound for new messages
            if (audioRef.current?.play) {
              try {
                audioRef.current.play();
              } catch (error) {
                console.log('Could not play notification sound:', error);
              }
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages'
        },
        () => {
          fetchUnreadCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  if (loading) {
    return (
      <Button variant="ghost" size="sm" className={className}>
        <Bell className="h-4 w-4" />
      </Button>
    );
  }

  return (
    <Button 
      variant="ghost" 
      size="sm" 
      onClick={onClick}
      className={`relative ${className}`}
    >
      <Bell className="h-4 w-4" />
      {unreadCount > 0 && (
        <Badge 
          variant="destructive" 
          className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
        >
          {unreadCount > 99 ? '99+' : unreadCount}
        </Badge>
      )}
    </Button>
  );
}