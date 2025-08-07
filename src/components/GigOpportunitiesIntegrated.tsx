// PASTE THIS ENTIRE CODE BLOCK

import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
// We will use the BookingCard in the next step, but we import it now.
// import { BookingCard } from './BookingCard'; 

// Define a type for the data we expect. Based on your schema.
interface GigApplication {
  id: string; // This is the gig_application_id
  status: string;
  // This represents the joined 'bookings' table data for the gig
  gigs: {
    id: string; // This is the original gig's booking_id
    event_type: string;
    event_date: string;
    description: string;
    // Add any other fields from the 'bookings' table you want to display
  }
}

export const GigOpportunitiesIntegrated = () => {
  const [availableGigs, setAvailableGigs] = useState<GigApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    };

    const fetchGigs = async () => {
      setLoading(true);
      
      // Fetches gig applications for the logged-in talent
      // that are still open for application.
      const { data, error } = await supabase
        .from('gig_applications')
        .select(`
          id,
          status,
          gigs:bookings (
            id,
            event_type,
            event_date,
            description
          )
        `)
        // This assumes a talent is associated via the user_id on the talent_profiles table
        // This may need to be adjusted based on your exact schema for linking talents to applications
        .eq('talent_id', user.id) // Or however talent is linked
        .eq('status', 'pending'); // Or 'available' - the status for an open gig

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
    <div style={{ padding: '20px' }}>
      <h2>Available Gig Opportunities</h2>
      {availableGigs.length > 0 ? (
        <div>
          {/* In the next step, we will map over availableGigs and render BookingCard components here */}
          <p>{availableGigs.length} gig(s) found. UI will be built in the next step.</p>
          <pre>{JSON.stringify(availableGigs, null, 2)}</pre>
        </div>
      ) : (
        <p>No available gig opportunities at the moment.</p>
      )}
    </div>
  );
};