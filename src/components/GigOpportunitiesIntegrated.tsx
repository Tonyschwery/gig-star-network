// PASTE THIS ENTIRE CODE BLOCK, REPLACING THE OLD FILE CONTENT

import { useState, useEffect } from 'react';
// *** BUG FIX: Corrected the import path for the Supabase client ***
import { supabase } from '../lib/supabase'; 
import { BookingCard } from './BookingCard'; 
import { useAuth } from '../hooks/useAuth';

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
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.error("No active session, cannot fetch gigs.");
        setLoading(false);
        return;
      }
      
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
        .eq('status', 'pending'); 

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
  
  return (
    <div>
      {applications.length > 0 ? (
        applications.map((app) => (
          <BookingCard
            key={app.id}
            booking={app.bookings} 
            isGig={true}
            gigApplicationId={app.id} 
          />
        ))
      ) : (
        <p>No available gig opportunities at the moment.</p>
      )}
    </div>
  );
};