// FILE: src/components/EventRequestCard.tsx

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Calendar, Clock, MapPin, MessageCircle, X, Mail, Phone, UserX, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { useChat } from "@/contexts/ChatContext";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useUnreadMessages } from "@/hooks/useUnreadMessages";

export interface EventRequest {
  id: string;
  booker_name: string;
  booker_email: string;
  booker_phone?: string | null;
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
  mode: 'talent' | 'booker' | 'admin';
  onRemove?: (requestId: string) => void;
}

export const EventRequestCard = ({ request, isActionable = false, mode, onRemove }: EventRequestCardProps) => {
  const { openChat } = useChat();
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);
  const [showDeclineDialog, setShowDeclineDialog] = useState(false);
  const { unreadCount } = useUnreadMessages();

  if (!request) {
    return null;
  }

  const handleRemove = async () => {
    try {
      const { error } = await supabase
        .from('event_requests')
        .delete()
        .eq('id', request.id);

      if (error) throw error;

      toast.success('Request removed successfully');
      setShowRemoveDialog(false);
      if (onRemove) {
        onRemove(request.id);
      }
    } catch (error) {
      console.error('Error removing request:', error);
      toast.error('Failed to remove request');
    }
  };

  const handleDecline = async () => {
    try {
      const { error } = await supabase
        .from('event_requests')
        .update({ status: 'declined' })
        .eq('id', request.id);

      if (error) throw error;

      toast.success('Request declined');
      setShowDeclineDialog(false);
      if (onRemove) {
        onRemove(request.id);
      }
    } catch (error) {
      console.error('Error declining request:', error);
      toast.error('Failed to decline request');
    }
  };

  const isBlurred = mode === 'talent' && !isActionable;

  return (
    <Card className="overflow-hidden transition-all hover:shadow-md bg-card text-card-foreground relative">
      {/* Remove Button for Booker and Talent */}
      {(mode === 'booker' || mode === 'talent') && (
        <AlertDialog open={showRemoveDialog} onOpenChange={setShowRemoveDialog}>
          <AlertDialogTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="absolute top-2 right-2 h-8 w-8 p-0 hover:bg-destructive hover:text-destructive-foreground z-10"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remove Request</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to remove this event request? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleRemove} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Remove
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="flex items-center gap-3 mb-2 text-base font-semibold">
              <span className="capitalize">Event Type: {request.event_type}</span>
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
        {/* Booker Information */}
        <div className="border rounded-lg p-3 bg-muted/30">
          <h4 className="font-medium mb-2 text-sm text-foreground">Booker Information</h4>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <span className="font-medium text-foreground">Booker Name:</span>
              <span className={cn("text-muted-foreground", isBlurred && "blur-sm select-none")}>
                {request.booker_name}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium text-foreground">Booker Email:</span>
              <span className={cn("text-muted-foreground", isBlurred && "blur-sm select-none")}>
                {request.booker_email}
              </span>
            </div>
            {request.booker_phone && (
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium text-foreground">Booker Phone:</span>
                <span className={cn("text-muted-foreground", isBlurred && "blur-sm select-none")}>
                  {request.booker_phone}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Event Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium text-foreground">Duration:</span>
            <span className="text-muted-foreground">{request.event_duration} hours</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium text-foreground">Event Location:</span>
            <span className="text-muted-foreground">{request.event_location}</span>
          </div>
        </div>

        {request.description && (
          <div className="border-t pt-3">
            <h4 className="font-medium mb-2 text-sm text-foreground">Event Description:</h4>
            <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded">
              {request.description}
            </p>
          </div>
        )}

        <div className="border-t pt-3 flex justify-between items-center">
          <div className="flex gap-2">
            {mode === 'talent' && (
              <AlertDialog open={showDeclineDialog} onOpenChange={setShowDeclineDialog}>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
                  >
                    <UserX className="h-4 w-4 mr-2" />
                    Decline
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Decline Request</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to decline this event request? This will notify the booker that you are not available.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDecline} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                      Decline
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
            {mode === 'admin' && onRemove && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Request</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to permanently delete this event request? This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleRemove} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>

          <div>
            {mode === 'booker' ? (
              <Button onClick={() => openChat(request.id, 'event_request')} size="sm" variant="outline" className="relative">
                <MessageCircle className="h-4 w-4 mr-2" />Chat with QTalent Team
                {unreadCount > 0 && (
                  <Badge 
                    variant="destructive" 
                    className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs animate-pulse"
                  >
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </Badge>
                )}
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
                        className={cn("relative", isBlurred && "opacity-50")}
                      >
                        <MessageCircle className="h-4 w-4 mr-2" />
                        Chat with Booker
                        {unreadCount > 0 && (
                          <Badge 
                            variant="destructive" 
                            className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs animate-pulse"
                          >
                            {unreadCount > 9 ? '9+' : unreadCount}
                          </Badge>
                        )}
                      </Button>
                    </span>
                  </TooltipTrigger>
                  {!isActionable && (
                    <TooltipContent>
                      <p>Upgrade to Pro to contact this booker directly and see full contact details.</p>
                    </TooltipContent>
                  )}
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};