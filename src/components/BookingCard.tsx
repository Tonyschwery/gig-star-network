// Safe placeholder code to restore the dashboard.
import React from 'react';
import { Button } from "@/components/ui/button"; // Keep a common import

// A minimal version of the props to prevent errors
interface BookingCardProps {
  booking: { id: string; event_type: string; };
  mode: 'talent' | 'booker';
}

export const BookingCard = ({ booking, mode }: BookingCardProps) => {
  return (
    <div style={{ padding: '20px', border: '1px solid #ccc', borderRadius: '8px', marginBottom: '10px' }}>
      <p>Booking ID: {booking.id}</p>
      <p>Event Type: {booking.event_type}</p>
      <p>Mode: {mode}</p>
      <Button variant="outline">Details</Button>
    </div>
  );
};