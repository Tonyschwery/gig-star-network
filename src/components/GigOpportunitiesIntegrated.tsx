// PASTE THIS ENTIRE CODE BLOCK - Using a different relative path for the import.

import React, { useState, useEffect } from 'react';
// *** BUG FIX: Trying another standard import path for the Supabase client ***
import { supabase } from '../../lib/supabase'; 
import { useAuth } from '../../hooks/useAuth';
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
          status,
          gigs:bookings (
            id,
            event_type,
            event_date,
            description
          )
        `)
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
    <div style={{ padding: '20px' }}>
      <h2>Available Gig Opportunities</h2>
      {availableGigs.length > 0 ? (
        <div>
          <p>{availableGigs.length} gig(s) found. UI will be built in the next step.</p>
          <pre>{JSON.stringify(availableGigs, null, 2)}</pre>
        </div>
      ) : (
        <p>No available gig opportunities at the moment.</p>
      )}
    </div>
  );
};