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

  if (!request) {
    return null;
  }

  return (
    <Card className="overflow-hidden transition-all hover:shadow-md bg-card text-card-foreground">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-3 mb-2 text-base font-semibold">
              <span className="capitalize">{request.event_type} Request</span>
              <Badge variant={request.status === 'pending' ? 'secondary' : 'default'} className="capitalize">
                {request.status}
              </Badge>
            </CardTitle>
            <p className="text-sm text-muted-foreground flex items-center">
              <Calendar className="inline h-4 w-4 mr-1.5" />
              {request.event_date ? format(new Date(request.event_date), 'PPP') : 'No date specified'}
            </p>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium text-foreground">Duration:</span>
                <span className="text-muted-foreground">{request.event_duration} hours</span>
            </div>
            <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium text-foreground">Location:</span>
                <span className="text-muted-foreground">{request.event_location}</span>
            </div>
        </div>

        {request.description && (
            <div className="border-t pt-3">
                <h4 className="font-medium mb-2 text-sm text-foreground">Event Description</h4>
                <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded">
                    {request.description}
                </p>
            </div>
        )}

        <div className="border-t pt-3 flex justify-end">
            {mode === 'booker' ? (
                // THE CHANGE: Updated the button text for clarity.
                <Button onClick={() => openChat(request.id, 'event_request')} size="sm" variant="outline">
                    <MessageCircle className="h-4 w-4 mr-2" />Chat with QTalent Team
                </Button>
            ) : (
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <span tabIndex={0}>
                                <Button 
                                    onClick={() => openChat(request.id, 'event_request')} 
                                    size="sm" 
                                    disabled={!isActionable}
                                    className="w-full"
                                >
                                    <MessageCircle className="h-4 w-4 mr-2" />
                                    Chat with Booker
                                </Button>
                            </span>
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