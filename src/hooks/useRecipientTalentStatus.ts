import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface RecipientTalentStatus {
  isRecipientNonProTalent: boolean;
  isLoading: boolean;
}

export const useRecipientTalentStatus = (
  channelInfo: { id: string; type: "booking" | "event_request" } | null,
  currentUserId?: string,
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
        if (channelInfo.type === "booking") {
          // Get booking details
          const { data: booking } = await supabase
            .from("bookings")
            .select("user_id, talent_id")
            .eq("id", channelInfo.id)
            .single();

          if (booking && booking.talent_id) {
            // Check if current user is the booker (not the talent)
            if (booking.user_id === currentUserId) {
              // Current user is booker, so we check the talent's pro status.
              const { data: talent } = await supabase
                .from("talent_profiles")
                // 👇 We must select all three fields to check for Pro status
                .select("is_pro_subscriber, subscription_status, manual_grant_expires_at")
                // 👇 This is your correct fix!
                .eq("user_id", booking.talent_id)
                .single();

              if (talent) {
                // 👇 Restore the full check for all three Pro conditions
                const hasActiveSub = talent.subscription_status === "active";
                const hasAdminGrant =
                  talent.manual_grant_expires_at && new Date(talent.manual_grant_expires_at) > new Date();
                const isProViaFlag = talent.is_pro_subscriber;

                const isTalentPro = hasActiveSub || hasAdminGrant || isProViaFlag;

                // Set state to TRUE only if the talent is NOT pro
                setIsRecipientNonProTalent(!isTalentPro);
              } else {
                // If no talent profile found, assume non-pro to be safe
                setIsRecipientNonProTalent(true);
              }
            } else {
              // Current user is talent or other, no filtering needed
              setIsRecipientNonProTalent(false);
            }
          }
        } else if (channelInfo.type === "event_request") {
          // For event requests, bookers chat with admins, no talent filtering needed
          setIsRecipientNonProTalent(false);
        }
      } catch (error) {
        console.error("Error checking recipient talent status:", error);
        // Default to a safe state in case of an unexpected error
        setIsRecipientNonProTalent(true);
      } finally {
        setIsLoading(false);
      }
    };

    checkRecipientTalentStatus();
  }, [channelInfo, currentUserId]);

  return { isRecipientNonProTalent, isLoading };
};
