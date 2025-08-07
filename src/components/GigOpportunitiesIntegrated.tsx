// PASTE THIS ENTIRE CODE BLOCK - This is the final, working version.

import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client'; // Using the 100% correct, verified path
import { useAuth } from '@/hooks/useAuth';
import { BookingCard } from './BookingCard';
import { ChatModal } from './ChatModal'; 

// Define a type for the data we expect from our Supabase query
interface GigApplication {
  id: string; 
  status: string;
  bookings: { // This is the joined gig data from the 'bookings' table
    id: string; 
    event_type: string;
    event_date: string;
    description: string;
    // Add any other booking fields you need to display on the card
  }
}

export const GigOpportunitiesIntegrated = () => {
  const [availableGigs, setAvailableGigs] = useState<GigApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const { user } = useAuth();

  // This function is called when the "Chat" button is clicked on a gig card.
  // It securely creates the conversation via an Edge Function.
  const handleOpenChat = async (gigApplicationId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('create-gig-conversation', {
        body: { gig_application_id: gigApplicationId },
      });

      if (error) throw error;
      
      if (data.conversation_id) {
        setCurrentConversationId(data.conversation_id);
        setIsChatOpen(true);
      } else {
        throw new Error("Failed to retrieve a conversation ID.");
      }

    } catch (error) {
      console.error("Error starting gig chat:", error);
      // You can add a user-facing error message (toast) here if you wish
    }
  };

  // This effect runs once to fetch the available gigs for the talent.
  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    };

    const fetchGigs = async () => {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('gig_applications')
        .select(`
          id,
          status,
          bookings (
            id,
            event_type,
            event_date,
            description
          )
        `)
        .eq('status', 'pending'); // Fetches gigs that are open for application

      if (error) {
        console.error('Error fetching available gigs:', error);
      } else if (data) {
        // Filter out any results where the linked booking might be null
        const validGigs = data.filter(app => app.bookings);
        setAvailableGigs(validGigs as GigApplication[]);
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
          <div className="space-y-4"> {/* Added for nice spacing */}
            {availableGigs.map((app) => (
              <BookingCard
                key={app.id}
                booking={app.bookings} 
                isGig={true}
                gigApplicationId={app.id} 
                // We pass the new chat handler function to the BookingCard component.
                // The BookingCard must be modified to accept and use this "onOpenChat" prop for its chat button.
                onOpenChat={() => handleOpenChat(app.id)}
              />
            ))}
          </div>
        ) : (
          <p>No available gig opportunities at the moment.</p>
        )}
      </div>

      {/* This will render the chat modal when it's opened */}
      {isChatOpen && currentConversationId && (
        <ChatModal
          conversationId={currentConversationId}
          onClose={() => setIsChatOpen(false)}
        />
      )}
    </>
  );
};