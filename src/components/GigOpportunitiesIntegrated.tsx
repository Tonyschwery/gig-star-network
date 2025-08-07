// PASTE THIS ENTIRE CODE BLOCK - Using a direct relative path to force resolution.

import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase'; // Using direct relative path
import { useAuth } from '../hooks/useAuth'; // Using direct relative path
import { BookingCard } from './BookingCard';

// Define a type for the data we expect
interface GigApplication {
  id: string; 
  status: string;
  bookings: { 
    id: string; 
    event_type: string;
    event_date: string;
    description: string;
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
        .eq('status', 'pending'); 

      if (error) {
        console.error('Error fetching available gigs:', error);
      } else if (data) {
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
    <div style={{ padding: '20px' }}>
      <h2>Available Gig Opportunities</h2>
      {availableGigs.length > 0 ? (
        <div>
          {availableGigs.map((app) => (
            <BookingCard
              key={app.id}
              booking={app.bookings} 
              isGig={true}
              gigApplicationId={app.id} 
            />
          ))}
        </div>
      ) : (
        <p>No available gig opportunities at the moment.</p>
      )}
    </div>
  );
};