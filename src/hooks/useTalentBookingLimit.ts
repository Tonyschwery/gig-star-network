import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export const useTalentBookingLimit = () => {
  const { user } = useAuth();
  const [canReceiveBooking, setCanReceiveBooking] = useState(true);
  const [receivedBookingsThisMonth, setReceivedBookingsThisMonth] = useState(0);
  const [isProUser, setIsProUser] = useState(false);
  const [loading, setLoading] = useState(true);
  const [talentId, setTalentId] = useState<string | null>(null);

  const checkTalentBookingLimit = async () => {
    console.log("[TALENT LIMIT DEBUG] Starting check for user:", user?.id);
    
    if (!user?.id) {
      // No user logged in - reset to booker defaults
      console.log("[TALENT LIMIT DEBUG] No user ID, setting booker defaults");
      setCanReceiveBooking(true);
      setReceivedBookingsThisMonth(0);
      setIsProUser(false);
      setTalentId(null);
      setLoading(false);
      return;
    }

    try {
      // Check if user is a talent and get their profile
      const { data: profile, error: queryError } = await supabase
        .from("talent_profiles")
        // We need artist_name to validate if it's a REAL profile
        .select("id, is_pro_subscriber, artist_name")
        .eq("user_id", user.id)
        .maybeSingle();

      console.log("[TALENT LIMIT DEBUG] Query result - Profile:", profile, "Error:", queryError);

      if (queryError) {
        console.error("[TALENT LIMIT DEBUG] Error querying talent profile:", queryError);
        // On error, assume booker (fail safe)
        setCanReceiveBooking(true);
        setReceivedBookingsThisMonth(0);
        setIsProUser(false);
        setTalentId(null);
        setLoading(false);
        return;
      }

      // ✅ THE REAL FIX IS HERE: A user is only a talent if they have a complete profile with an artist_name.
      if (!profile || !profile.artist_name) {
        // User is NOT a talent (they are a booker or have a ghost profile), no limits apply
        console.log("[TALENT LIMIT DEBUG] No profile or artist_name - User is BOOKER");
        setCanReceiveBooking(true);
        setReceivedBookingsThisMonth(0);
        setIsProUser(false);
        setTalentId(null);
        setLoading(false);
        return;
      }

      console.log("[TALENT LIMIT DEBUG] User IS a talent with ID:", profile.id, "Pro:", profile.is_pro_subscriber);

      // User IS a talent - set their talent ID
      setTalentId(profile.id);
      // Let's also check for subscription status for Pro, making it more robust
      const isPro = profile.is_pro_subscriber;
      setIsProUser(isPro);

      // If pro talent, no limits
      if (isPro) {
        setCanReceiveBooking(true);
        setReceivedBookingsThisMonth(0);
        setLoading(false);
        return;
      }

      // For non-pro talents, get received bookings count
      const { data: countData, error } = await supabase.rpc("get_talent_received_bookings_count", {
        talent_id_param: profile.id,
      });

      if (error) {
        console.error("Error getting received bookings count:", error);
        setReceivedBookingsThisMonth(0);
      } else {
        setReceivedBookingsThisMonth(countData || 0);
      }

      // Non-pro talents can receive up to 1 booking per month
      setCanReceiveBooking((countData || 0) < 1);
    } catch (error) {
      console.error("Error checking talent booking limit:", error);
      // On error, reset to booker defaults (fail safe)
      setCanReceiveBooking(true);
      setReceivedBookingsThisMonth(0);
      setIsProUser(false);
      setTalentId(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.id) {
      checkTalentBookingLimit();
    } else {
      // Handle logout: immediately reset state to booker defaults
      setCanReceiveBooking(true);
      setReceivedBookingsThisMonth(0);
      setIsProUser(false);
      setTalentId(null);
      setLoading(false);
    }
  }, [user?.id]);

  const isTalentValue = !!talentId;
  console.log("[TALENT LIMIT DEBUG] Final return - isTalent:", isTalentValue, "talentId:", talentId, "isProUser:", isProUser);

  return {
    canReceiveBooking,
    receivedBookingsThisMonth,
    isProUser,
    loading,
    maxBookingsPerMonth: isProUser ? "Unlimited" : 1,
    refetchLimit: checkTalentBookingLimit,
    talentId,
    isTalent: isTalentValue,
  };
};
