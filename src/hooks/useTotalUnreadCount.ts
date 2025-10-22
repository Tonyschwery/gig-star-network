import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export const useTotalUnreadCount = (channelType: 'booking' | 'event_request') => {
  const { user } = useAuth();
  const [totalUnread, setTotalUnread] = useState(0);

  useEffect(() => {
    if (!user) {
      setTotalUnread(0);
      return;
    }

    const fetchTotalUnread = async () => {
      try {
        let channelIds: string[] = [];

        if (channelType === 'booking') {
          // Get all booking IDs where user is involved (as booker or talent)
          const { data: asBooker } = await supabase
            .from('bookings')
            .select('id')
            .eq('user_id', user.id);

          const { data: talentProfile } = await supabase
            .from('talent_profiles')
            .select('id')
            .eq('user_id', user.id)
            .maybeSingle();

          let asTalent: any[] = [];
          if (talentProfile?.id) {
            const { data } = await supabase
              .from('bookings')
              .select('id')
              .eq('talent_id', talentProfile.id);
            asTalent = data || [];
          }

          channelIds = [
            ...(asBooker || []).map(b => b.id),
            ...asTalent.map(b => b.id)
          ];
        } else if (channelType === 'event_request') {
          // Get all event request IDs where user is the booker
          const { data } = await supabase
            .from('event_requests')
            .select('id')
            .eq('user_id', user.id);
          
          channelIds = (data || []).map(r => r.id);
        }

        if (channelIds.length === 0) {
          setTotalUnread(0);
          return;
        }

        // Count unread messages across all channels
        let unreadCount = 0;
        
        for (const channelId of channelIds) {
          const { data: lastMessage } = await supabase
            .from('chat_messages')
            .select('sender_id, created_at')
            .eq(channelType === 'booking' ? 'booking_id' : 'event_request_id', channelId)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          // Count as unread if last message is not from current user
          if (lastMessage && lastMessage.sender_id !== user.id) {
            unreadCount++;
          }
        }

        setTotalUnread(unreadCount);
      } catch (error) {
        console.error(`Error fetching total unread ${channelType}:`, error);
        setTotalUnread(0);
      }
    };

    fetchTotalUnread();

    // Set up real-time subscription for new messages
    const channel = supabase
      .channel(`total-unread-${channelType}-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages'
        },
        (payload) => {
          // Only update count if the message is not from the current user
          if (payload.new.sender_id !== user.id) {
            fetchTotalUnread();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, channelType]);

  return { totalUnread };
};
