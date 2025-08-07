import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface BookingWorkflowManagerProps {
  userId: string;
  onBookingUpdate?: () => void;
}

export function BookingWorkflowManager({ userId, onBookingUpdate }: BookingWorkflowManagerProps) {
  const { toast } = useToast();

  useEffect(() => {
    // MASTER TASK 2: Real-time monitoring of the complete booking workflow
    const workflowChannel = supabase
      .channel('booking-workflow-manager')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'bookings'
        },
        (payload) => {
          const booking = payload.new;
          const oldBooking = payload.old;
          
          // Only show notifications for relevant status changes
          if (booking.status !== oldBooking?.status) {
            console.log('Booking status changed:', {
              bookingId: booking.id,
              oldStatus: oldBooking?.status,
              newStatus: booking.status,
              userId: booking.user_id,
              talentId: booking.talent_id
            });

            // MASTER TASK 2: Handle specific workflow transitions
            switch (booking.status) {
              case 'pending_approval':
                if (booking.user_id === userId) {
                  toast({
                    title: "Invoice Received",
                    description: "Your talent has sent an invoice. Check the 'Awaiting Payment' section.",
                  });
                }
                break;

              case 'confirmed':
                toast({
                  title: "Booking Confirmed! 🎉",
                  description: "Payment successful! Your booking is now confirmed.",
                });
                break;

              case 'pending':
                if (booking.user_id === userId && oldBooking?.status === 'pending_approval') {
                  toast({
                    title: "Invoice Declined",
                    description: "The invoice was declined. The talent can send a new one.",
                  });
                }
                break;
            }

            // Trigger refresh callback
            if (onBookingUpdate) {
              onBookingUpdate();
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'payments'
        },
        (payload) => {
          const payment = payload.new;
          const oldPayment = payload.old;
          
          // Monitor payment status changes
          if (payment.payment_status !== oldPayment?.payment_status) {
            console.log('Payment status changed:', {
              paymentId: payment.id,
              bookingId: payment.booking_id,
              oldStatus: oldPayment?.payment_status,
              newStatus: payment.payment_status
            });

            // MASTER TASK 2: Handle payment completion
            if (payment.payment_status === 'paid' || payment.payment_status === 'completed') {
              toast({
                title: "Payment Processed! 💰",
                description: "Payment successful! Your booking is being confirmed.",
              });
              
              if (onBookingUpdate) {
                onBookingUpdate();
              }
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(workflowChannel);
    };
  }, [userId, onBookingUpdate, toast]);

  // This component doesn't render anything - it's just for workflow management
  return null;
}