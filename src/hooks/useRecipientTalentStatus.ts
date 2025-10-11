import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface RecipientTalentStatus {
  isRecipientNonProTalent: boolean;
  isLoading: boolean;
}

export const useRecipientTalentStatus = (
  channelInfo: { id: string; type: "booking" | "event_request" } | null,
  currentUserId?: string
): RecipientTalentStatus => {
  const [isRecipientNonProTalent, setIsRecipientNonProTalent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const checkRecipientTalentStatus = async () => {
      if (!channelInfo || !currentUserId) {
        setIsRecipientNonProTalent(false);
        return;
      }

      setIsLoading(true);
      try {
        if (channelInfo.type === 'booking') {
          // Get booking details
          const { data: booking } = await supabase
            .from('bookings')
            .select('user_id, talent_id')
            .eq('id', channelInfo.id)
            .single();

          if (booking && booking.talent_id) {
            // Check if current user is the booker (not the talent)
            if (booking.user_id === currentUserId) {
              // Current user is booker, check if talent is non-pro
              const { data: talent } = await supabase
                .from('talent_profiles')
                .select('is_pro_subscriber')
                .eq('id', booking.talent_id)
                .single();

              setIsRecipientNonProTalent(talent && !talent.is_pro_subscriber);
            } else {
              // Current user is talent or other, no filtering needed
              setIsRecipientNonProTalent(false);
            }
          }
        } else if (channelInfo.type === 'event_request') {
          // For event requests, bookers chat with admins, no talent filtering needed
          setIsRecipientNonProTalent(false);
        }
      } catch (error) {
        console.error('Error checking recipient talent status:', error);
        setIsRecipientNonProTalent(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkRecipientTalentStatus();
  }, [channelInfo, currentUserId]);

  return { isRecipientNonProTalent, isLoading };
};