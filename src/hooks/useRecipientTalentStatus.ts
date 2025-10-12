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
      // DEBUGGING: Log initial inputs to the hook
      console.log("[DEBUG] Hook started. Channel Info:", channelInfo, "Current User ID:", currentUserId);

      if (!channelInfo || !currentUserId) {
        setIsRecipientNonProTalent(false);
        return;
      }

      setIsLoading(true);
      try {
        if (channelInfo.type === "booking") {
          // DEBUGGING: About to fetch booking
          console.log("[DEBUG] Fetching booking with ID:", channelInfo.id);

          const { data: booking, error: bookingError } = await supabase
            .from("bookings")
            .select("user_id, talent_id")
            .eq("id", channelInfo.id)
            .single();

          // DEBUGGING: Log booking result
          console.log("[DEBUG] Booking data:", booking, "Booking error:", bookingError);

          if (booking && booking.talent_id) {
            const isCurrentUserBooker = booking.user_id === currentUserId;
            // DEBUGGING: Check if the current user is the booker
            console.log("[DEBUG] Is current user the booker?", isCurrentUserBooker);

            if (isCurrentUserBooker) {
              // DEBUGGING: About to fetch talent profile
              console.log("[DEBUG] Fetching talent profile with user_id:", booking.talent_id);

              const { data: talent, error: talentError } = await supabase
                .from("talent_profiles")
                .select("is_pro_subscriber, subscription_status, manual_grant_expires_at")
                .eq("user_id", booking.talent_id)
                .single();

              // DEBUGGING: This is the most critical log.
              console.log("[DEBUG] Talent Profile Data:", talent, "Talent Profile Error:", talentError);

              if (talent) {
                const hasActiveSub = talent.subscription_status === "active";
                const hasAdminGrant =
                  talent.manual_grant_expires_at && new Date(talent.manual_grant_expires_at) > new Date();
                const isProViaFlag = talent.is_pro_subscriber;

                const isTalentPro = hasActiveSub || hasAdminGrant || isProViaFlag;

                // DEBUGGING: Log the final pro check results
                console.log(
                  `[DEBUG] Pro Checks: hasActiveSub=${hasActiveSub}, hasAdminGrant=${hasAdminGrant}, isProViaFlag=${isProViaFlag}`,
                );
                console.log("[DEBUG] Is Talent Pro?", isTalentPro);

                setIsRecipientNonProTalent(!isTalentPro);
                console.log("[DEBUG] Final State Set (isRecipientNonProTalent):", !isTalentPro);
              } else {
                console.log("[DEBUG] Talent profile was not found. Defaulting to NON-PRO.");
                setIsRecipientNonProTalent(true);
              }
            } else {
              setIsRecipientNonProTalent(false);
            }
          } else {
            console.log("[DEBUG] Booking not found or has no talent_id. Defaulting to no filter.");
            setIsRecipientNonProTalent(false);
          }
        } else {
          setIsRecipientNonProTalent(false);
        }
      } catch (error) {
        console.error("[DEBUG] A critical error occurred in the hook:", error);
        setIsRecipientNonProTalent(true);
      } finally {
        setIsLoading(false);
        console.log("[DEBUG] Hook finished.");
      }
    };

    checkRecipientTalentStatus();
  }, [channelInfo, currentUserId]);

  return { isRecipientNonProTalent, isLoading };
};
