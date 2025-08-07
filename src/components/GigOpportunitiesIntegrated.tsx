// PASTE THIS ENTIRE CODE BLOCK, REPLACING THE OLD FILE CONTENT

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase'; // Assuming you have a supabase client lib file
import { BookingCard } from './BookingCard'; // Assuming this is your reusable card
import { useAuth } from '@/hooks/useAuth'; // Assuming you have an auth hook

interface GigApplication {
  id: string;
  // ... other gig application properties
  bookings: { // Assuming 'bookings' is the name of your related gig data
    id: string;
    event_type: string;
    event_date: string;
    // ... other booking properties
  };
}

export const GigOpportunitiesIntegrated = () => {
  const [applications, setApplications] = useState<GigApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth(); // Use your auth hook to get user info

  useEffect(() => {
    const fetchGigOpportunities = async () => {
      // *** BUG FIX START: Ensure user session is valid before fetching ***
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.error("No active session, cannot fetch gigs.");
        setLoading(false);
        return;
      }
      // *** BUG FIX END ***

      // Fetch gig applications that are available to the talent
      // This query might need adjustment based on your exact schema
      const { data, error } = await supabase
        .from('gig_applications')
        .select(`
          id,
          bookings (
            id,
            event_type,
            event_date
          )
        `)
        .eq('status', 'pending'); // or whatever status indicates an available gig

      if (error) {
        console.error('Error fetching gig opportunities:', error);
      } else {
        setApplications(data as GigApplication[]);
      }
      setLoading(false);
    };

    if(user) {
        fetchGigOpportunities();
    }
  }, [user]);

  if (loading) {
    return <div>Loading Gig Opportunities...</div>;
  }

  // --- The rest of your component's return statement ---
  // This is a simplified example of the render part.
  // The key is that the `BookingCard` will now be rendered with valid data
  // and the user session will be active when its buttons are clicked.

  return (
    <div>
      {applications.length > 0 ? (
        applications.map((app) => (
          <BookingCard
            key={app.id}
            booking={app.bookings} // Pass the nested booking object
            isGig={true}
            gigApplicationId={app.id} // Pass the application ID for chat/actions
          />
        ))
      ) : (
        <p>No available gig opportunities at the moment.</p>
      )}
    </div>
  );
};