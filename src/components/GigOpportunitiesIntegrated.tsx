// PASTE THIS CLEANER VERSION

import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { BookingCard } from './BookingCard';
import { ChatModal } from './ChatModal';

interface GigBooking {
  id: string; 
  status: string;
  event_type: string;
  event_date: string;
  description: string;
  talent_id: string | null; 
}

export const GigOpportunitiesIntegrated = () => {
  const [availableGigs, setAvailableGigs] = useState<GigBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const { user } = useAuth();

  const handleOpenChat = async (bookingId: string) => {
    console.log("Chat for this gig will be enabled next. Booking ID:", bookingId);
    alert("Chat functionality will be connected in the next step.");
  };

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    };

    const fetchGigs = async () => {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          id,
          status,
          event_type,
          event_date,
          description,
          talent_id
        `)
        .eq('is_gig_opportunity', true) 
        .eq('status', 'pending');

      if (error) {
        console.error('Error fetching available gigs:', error);
      } else if (data) {
        setAvailableGigs(data);
      }
      setLoading(false);
    };

    fetchGigs();
  }, [user]);

  if (loading) {
    return <div>Loading Gig Opportunities...</div>;
  }

  return (
    <>
      <div style={{ padding: '20px' }}>
        <h2>Available Gig Opportunities</h2>
        {availableGigs.length > 0 ? (
          <div className="space-y-4"> 
            {availableGigs.map((gig) => (
              <BookingCard
                key={gig.id}
                booking={gig} 
                isGig={true}
                gigApplicationId={gig.id} 
                onOpenChat={() => handleOpenChat(gig.id)}
              />
            ))}
          </div>
        ) : (
          <p>No available gig opportunities at the moment.</p>
        )}
      </div>

      {isChatOpen && currentConversationId && (
        <ChatModal
          conversationId={currentConversationId}
          onClose={() => setIsChatOpen(false)}
        />
      )}
    </>
  );
};