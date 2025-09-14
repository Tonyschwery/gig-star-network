import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, MapPin, MessageCircle } from "lucide-react";
import { format } from "date-fns";
import { useChat } from "@/contexts/ChatContext";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
//stk
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
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-3 mb-2">
              <span className="capitalize">{request.event_type} Request</span>
              <Badge variant={request.status === 'pending' ? 'secondary' : 'default'} className="capitalize">
                {request.status}
              </Badge>
            </CardTitle>
            <p className="text-sm text-muted-foreground flex items-center">
              <Calendar className="inline h-4 w-4 mr-1.5" />
              {format(new Date(request.event_date), 'PPP')}
            </p>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Duration:</span>
                <span>{request.event_duration} hours</span>
            </div>
            <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Location:</span>
                <span>{request.event_location}</span>
            </div>
        </div>

        {request.description && (
            <div className="border-t pt-3">
                <h4 className="font-medium mb-2 text-sm">Event Description</h4>
                <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded">
                    {request.description}
                </p>
            </div>
        )}

        {request.admin_reply && (
            <div className="border-t pt-3">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <MessageCircle className="h-4 w-4 text-blue-600" />
                        <h4 className="font-medium text-blue-800 text-sm">Note from QTalents Team</h4>
                    </div>
                    <p className="text-blue-700 text-sm">{request.admin_reply}</p>
                </div>
            </div>
        )}

        <div className="border-t pt-3 flex justify-end">
            {mode === 'booker' ? (
                <Button onClick={() => openChat(request.id)} size="sm" variant="outline">
                    <MessageCircle className="h-4 w-4 mr-2" />Chat with Admin
                </Button>
            ) : (
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button 
                                onClick={() => openChat(request.id)} 
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

