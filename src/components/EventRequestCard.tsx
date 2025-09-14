import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, MapPin, MessageCircle } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { supabase } from '@/integrations/supabase/client';

export interface EventRequest {
  id: string;
  event_type: string;
  event_date: string;
  event_duration: number;
  event_location: string;
  description?: string | null;
  status: string;
  admin_reply?: string | null;
  replied_at?: string | null;
}

interface EventRequestCardProps {
  request: EventRequest;
  mode: 'talent' | 'booker';
  onUpdate?: () => void;
}

export const EventRequestCard = ({ request, mode, onUpdate }: EventRequestCardProps) => {
  const { toast } = useToast();

  const handleAcceptOpportunity = async () => {
    // Logic to accept an opportunity would go here
    toast({ title: "Interest shown!", description: "The admin has been notified of your interest." });
    // Example: await supabase.from('event_requests').update({ status: 'talent_interested' }).eq('id', request.id);
    onUpdate?.();
  };
  
  const getStatusBadge = (status: string) => {
    switch (status) {
        case 'pending': return <Badge variant="secondary">Pending Review</Badge>;
        case 'approved': return <Badge variant="success">Approved</Badge>;
        case 'declined': return <Badge variant="destructive">Declined</Badge>;
        default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <Card className="overflow-hidden transition-all hover:shadow-md">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-3 mb-2">
              <span className="capitalize">{request.event_type} Opportunity</span>
              {getStatusBadge(request.status)}
            </CardTitle>
            <p className="text-sm text-muted-foreground">
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
                    <p className="text-blue-700 text-sm">
                        {request.admin_reply}
                    </p>
                </div>
            </div>
        )}

        {mode === 'talent' && request.status === 'pending' && (
            <div className="border-t pt-3 flex justify-end">
                <Button onClick={handleAcceptOpportunity} size="sm">Show Interest</Button>
            </div>
        )}
      </CardContent>
    </Card>
  );
};
