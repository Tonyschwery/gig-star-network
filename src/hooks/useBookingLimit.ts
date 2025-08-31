import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export const useBookingLimit = () => {
  const { user } = useAuth();
  const [canCreateBooking, setCanCreateBooking] = useState(true);
  const [bookingsThisMonth, setBookingsThisMonth] = useState(0);
  const [isProUser, setIsProUser] = useState(false);
  const [loading, setLoading] = useState(true);

  const checkBookingLimit = async () => {
    if (!user?.id) return;

    try {
      // Check if user is pro subscriber
      const { data: profile } = await supabase
        .from('talent_profiles')
        .select('is_pro_subscriber')
        .eq('user_id', user.id)
        .maybeSingle();

      const isPro = profile?.is_pro_subscriber || false;
      setIsProUser(isPro);

      // If pro user, no limits
      if (isPro) {
        setCanCreateBooking(true);
        setLoading(false);
        return;
      }

      // For free users, check monthly limit
      const currentDate = new Date();
      const currentMonth = currentDate.getMonth();
      const currentYear = currentDate.getFullYear();
      
      const startOfMonth = new Date(currentYear, currentMonth, 1).toISOString();
      const endOfMonth = new Date(currentYear, currentMonth + 1, 0).toISOString();

      const { data: monthlyBookings } = await supabase
        .from('bookings')
        .select('id')
        .eq('user_id', user.id)
        .gte('created_at', startOfMonth)
        .lte('created_at', endOfMonth);

      const count = monthlyBookings?.length || 0;
      setBookingsThisMonth(count);
      setCanCreateBooking(count < 1); // Free users get 1 booking per month
      
    } catch (error) {
      console.error('Error checking booking limit:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkBookingLimit();
  }, [user?.id]);

  return {
    canCreateBooking,
    bookingsThisMonth,
    isProUser,
    loading,
    maxBookingsPerMonth: isProUser ? 'Unlimited' : 1,
    refetchLimit: checkBookingLimit
  };
};