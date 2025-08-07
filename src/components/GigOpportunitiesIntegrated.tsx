// PASTE THIS ENTIRE CODE BLOCK - With corrected data-fetching logic.

import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { BookingCard } from './BookingCard';
import { ChatModal } from './ChatModal'; 

// Define a type for the data we expect
interface GigBooking {
  id: string; 
  status: string;
  event_type: string;
  event_date: string;
  description: string;
  // This will be null because no specific talent has been assigned yet
  talent_id: string | null; 
}

export const GigOpportunitiesIntegrated = () => {
  const [availableGigs, setAvailableGigs] = useState<GigBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const { user } = useAuth();

  const handleOpenChat = async (bookingId: string) => {
    // This function will likely need a way to create a gig_application first
    // For now, let's focus on displaying the gigs. We will wire this button next.
    console.log("Chat for this gig will be enabled next. Booking ID:", bookingId);
    // Placeholder to prevent errors
    alert("Chat functionality will be connected in the next step.");
  };

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    };

    const fetchGigs = async () => {
      setLoading(true);
      
      // *** BUG FIX START: Corrected the query to fetch all open gigs ***
      // Instead of querying 'gig_applications', we query 'bookings' directly
      // for items marked as gig opportunities.
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
        .eq('is_gig_opportunity', true) // This is the key filter for gigs
        .eq('status', 'pending');       // Fetches gigs that are open for application

      if (error) {
        console.error('Error fetching available gigs:', error);
      } else if (data) {
        setAvailableGigs(data);
      }
      // *** BUG FIX END ***
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
                // We will need a gig_application_id later, for now we pass the booking id
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