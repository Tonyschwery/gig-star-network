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
      console.log("[CRITICAL DEBUG] Hook effect ran. channelInfo:", channelInfo, "currentUserId:", currentUserId);
      // DEBUGGING: Log initial inputs to the hook
      console.log(
        "[RECIPIENT STATUS DEBUG] Hook started. Channel Info:",
        channelInfo,
        "Current User ID:",
        currentUserId,
      );
      // DEBUGGING: Log initial inputs to the hook
      console.log(
        "[RECIPIENT STATUS DEBUG] Hook started. Channel Info:",
        channelInfo,
        "Current User ID:",
        currentUserId,
      );

      if (!channelInfo || !currentUserId) {
        setIsRecipientNonProTalent(false);
        return;
      }

      setIsLoading(true);
      try {
        if (channelInfo.type === "booking") {
          // DEBUGGING: About to fetch booking
          console.log("[RECIPIENT STATUS DEBUG] Fetching booking with ID:", channelInfo.id);

          const { data: booking, error: bookingError } = await supabase
            .from("bookings")
            .select("user_id, talent_id")
            .eq("id", channelInfo.id)
            .single();

          // DEBUGGING: Log booking result
          console.log("[RECIPIENT STATUS DEBUG] Booking data:", booking, "Booking error:", bookingError);

          if (booking && booking.talent_id) {
            const isCurrentUserBooker = booking.user_id === currentUserId;
            // DEBUGGING: Check if the current user is the booker
            console.log("[RECIPIENT STATUS DEBUG] Is current user the booker?", isCurrentUserBooker);

            if (isCurrentUserBooker) {
              // DEBUGGING: About to fetch talent profile
              console.log("[RECIPIENT STATUS DEBUG] Fetching talent profile with ID:", booking.talent_id);

              const { data: talent, error: talentError } = await supabase
                .from("talent_profiles")
                .select("is_pro_subscriber, subscription_status, manual_grant_expires_at")
                .eq("id", booking.talent_id)
                .single();

              // DEBUGGING: This is the most critical log.
              console.log(
                "[RECIPIENT STATUS DEBUG] Talent Profile Data:",
                talent,
                "Talent Profile Error:",
                talentError,
              );

              if (talent) {
                const hasActiveSub = talent.subscription_status === "active";
                const hasAdminGrant =
                  talent.manual_grant_expires_at && new Date(talent.manual_grant_expires_at) > new Date();
                const isProViaFlag = talent.is_pro_subscriber;

                const isTalentPro = hasActiveSub || hasAdminGrant || isProViaFlag;

                // DEBUGGING: Log the final pro check results
                console.log(
                  `[RECIPIENT STATUS DEBUG] Pro Checks: hasActiveSub=${hasActiveSub}, hasAdminGrant=${hasAdminGrant}, isProViaFlag=${isProViaFlag}`,
                );
                console.log("[RECIPIENT STATUS DEBUG] Is Talent Pro?", isTalentPro);

                setIsRecipientNonProTalent(!isTalentPro);
                console.log("[RECIPIENT STATUS DEBUG] Final State Set (isRecipientNonProTalent):", !isTalentPro);
              } else {
                // This block runs if the profile isn't found (e.g., due to RLS).
                // We default to FALSE to prevent blocking the user.
                console.warn(
                  `[RECIPIENT STATUS DEBUG] Talent profile not found for ID: ${booking.talent_id}. Defaulting to PRO status to allow chat.`,
                );
                setIsRecipientNonProTalent(false);
              }
            } else {
              setIsRecipientNonProTalent(false);
            }
          } else {
            console.log("[RECIPIENT STATUS DEBUG] Booking not found or has no talent_id. Defaulting to no filter.");
            setIsRecipientNonProTalent(false);
          }
        } else {
          setIsRecipientNonProTalent(false);
        }
      } catch (error) {
        console.error("[RECIPIENT STATUS DEBUG] ❌ CRITICAL ERROR occurred:", error);
        // ✅ FIX: Default to FALSE (assume Pro/allow chat) on errors to prevent false positives
        setIsRecipientNonProTalent(false);
        console.log("[RECIPIENT STATUS DEBUG] Error occurred, defaulting to FALSE (allow chat)");
      } finally {
        setIsLoading(false);
        console.log("[RECIPIENT STATUS DEBUG] Hook finished.");
      }
    };

    checkRecipientTalentStatus();
  }, [channelInfo, currentUserId]);

  return { isRecipientNonProTalent, isLoading };
};
