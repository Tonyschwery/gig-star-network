// FILE: src/components/EventRequestCard.tsx

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, MapPin, MessageCircle } from "lucide-react";
import { format } from "date-fns";
import { useChat } from "@/contexts/ChatContext";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export interface EventRequest {
  id: string;
  booker_name: string;
  event_type: string;
  event_date: string;
  event_duration: number;
  event_location: string;
  description?: string | null;
  status: string;
  admin_reply?: string | null;
}

interface EventRequestCardProps {
  request: EventRequest;
  isActionable?: boolean;
  mode: 'talent' | 'booker';
}

export const EventRequestCard = ({ request, isActionable = false, mode }: EventRequestCardProps) => {
  const { openChat } = useChat();

  return (
    <Card className="overflow-hidden transition-all hover:shadow-md">
      {/* ... (The top part of the card is unchanged) ... */}
      
      <CardContent className="space-y-4">
        {/* ... (The content details are unchanged) ... */}
        
        <div className="border-t pt-3 flex justify-end">
            {/* THE FIX: Pass the chat type 'event_request' to the openChat function */}
            {mode === 'booker' ? (
                <Button onClick={() => openChat(request.id, 'event_request')} size="sm" variant="outline">
                    <MessageCircle className="h-4 w-4 mr-2" />Chat with Admin
                </Button>
            ) : (
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button 
                                onClick={() => openChat(request.id, 'event_request')} 
                                size="sm" 
                                disabled={!isActionable}
                            >
                                <MessageCircle className="h-4 w-4 mr-2" />
                                Chat with Booker
                            </Button>
                        </TooltipTrigger>
                        {!isActionable && (
                            <TooltipContent>
                                <p>Upgrade to Pro to contact this booker directly.</p>
                            </TooltipContent>
                        )}
                    </Tooltip>
                </TooltipProvider>
            )}
        </div>
      </CardContent>
    </Card>
  );
};