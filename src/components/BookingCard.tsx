// FILE: src/components/BookingCard.tsx

import React from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, Check, X, Clock3, MessageCircle } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useChat } from "@/contexts/ChatContext";

export interface Booking {
  id: string;
  booker_name: string;
  event_date: string;
  event_duration: number;
  event_location: string;
  status: string;
  user_id: string;
  talent_id?: string;
  talent_profiles?: { artist_name: string };
  event_type: string;
  is_pro_subscriber?: boolean;
}

interface BookingCardProps {
  booking: Booking;
  mode: 'talent' | 'booker';
  onUpdate?: () => void;
}

export const BookingCard = ({ booking, mode, onUpdate }: BookingCardProps) => {
  const { toast } = useToast();
  const { openChat } = useChat();

  // ... (handleUpdateStatus, safeFormatDate, getStatusBadgeVariant functions are unchanged)

  return (
    <div className="border rounded-lg p-4 bg-card space-y-3 transition-all hover:shadow-md">
      {/* ... (The top part of the card is unchanged) ... */}
      
      <div className="flex flex-wrap gap-2 pt-2 border-t mt-2">
        {/* THE FIX: Pass the chat type 'booking' to the openChat function */}
        <Button onClick={() => openChat(booking.id, 'booking')} variant="outline" size="sm">
          <MessageCircle className="h-4 w-4 mr-2" />Chat
        </Button>
        
        {/* ... (The rest of the buttons are unchanged) ... */}
      </div>
    </div>
  );
}