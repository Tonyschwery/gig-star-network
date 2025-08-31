import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export const useTalentBookingLimit = () => {
  const { user } = useAuth();
  const [canAcceptBooking, setCanAcceptBooking] = useState(true);
  const [acceptedBookingsThisMonth, setAcceptedBookingsThisMonth] = useState(0);
  const [isProUser, setIsProUser] = useState(false);
  const [loading, setLoading] = useState(true);
  const [talentId, setTalentId] = useState<string | null>(null);

  const checkTalentBookingLimit = async () => {
    if (!user?.id) return;

    try {
      // Check if user is a talent and get their profile
      const { data: profile } = await supabase
        .from('talent_profiles')
        .select('id, is_pro_subscriber')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!profile) {
        // User is not a talent, no limits apply
        setCanAcceptBooking(true);
        setIsProUser(false);
        setTalentId(null);
        setLoading(false);
        return;
      }

      setTalentId(profile.id);
      const isPro = profile.is_pro_subscriber || false;
      setIsProUser(isPro);

      // If pro talent, no limits
      if (isPro) {
        setCanAcceptBooking(true);
        setAcceptedBookingsThisMonth(0);
        setLoading(false);
        return;
      }

      // For non-pro talents, get accepted bookings count using the database function
      const { data: countData, error } = await supabase
        .rpc('get_talent_accepted_bookings_count', { talent_id_param: profile.id });

      if (error) {
        console.error('Error getting accepted bookings count:', error);
        setAcceptedBookingsThisMonth(0);
      } else {
        setAcceptedBookingsThisMonth(countData || 0);
      }

      // Non-pro talents can accept up to 1 booking per month
      setCanAcceptBooking((countData || 0) < 1);
      
    } catch (error) {
      console.error('Error checking talent booking limit:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkTalentBookingLimit();
  }, [user?.id]);

  return {
    canAcceptBooking,
    acceptedBookingsThisMonth,
    isProUser,
    loading,
    maxBookingsPerMonth: isProUser ? 'Unlimited' : 1,
    refetchLimit: checkTalentBookingLimit,
    talentId,
    isTalent: !!talentId
  };
};