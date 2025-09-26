import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export const useTalentBookingLimit = () => {
  const { user } = useAuth();
  const [canReceiveBooking, setCanReceiveBooking] = useState(true);
  const [receivedBookingsThisMonth, setReceivedBookingsThisMonth] = useState(0);
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
        setCanReceiveBooking(true);
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
        setCanReceiveBooking(true);
        setReceivedBookingsThisMonth(0);
        setLoading(false);
        return;
      }

      // For non-pro talents, get received bookings count using the database function
      const { data: countData, error } = await supabase
        .rpc('get_talent_received_bookings_count', { talent_id_param: profile.id });

      if (error) {
        console.error('Error getting received bookings count:', error);
        setReceivedBookingsThisMonth(0);
      } else {
        setReceivedBookingsThisMonth(countData || 0);
      }

      // Non-pro talents can receive up to 1 booking per month
      setCanReceiveBooking((countData || 0) < 1);
      
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
    canReceiveBooking,
    receivedBookingsThisMonth,
    isProUser,
    loading,
    maxBookingsPerMonth: isProUser ? 'Unlimited' : 1,
    refetchLimit: checkTalentBookingLimit,
    talentId,
    isTalent: !!talentId
  };
};