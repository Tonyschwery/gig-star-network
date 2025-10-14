// FILE: src/components/EventRequestCard.tsx

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Calendar, Clock, MapPin, MessageCircle, X, Mail, Phone, Trash2, Crown, EyeOff } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { useChat } from "@/contexts/ChatContext";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useIndividualUnreadCount } from "@/hooks/useIndividualUnreadCount";

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
  mode: "talent" | "booker" | "admin";
  onRemove?: (requestId: string) => void;
}

export const EventRequestCard = ({ request, isActionable = false, mode, onRemove }: EventRequestCardProps) => {
  const { openChat } = useChat();
  const { unreadCount } = useIndividualUnreadCount(request.id, 'event_request');
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);
  const navigate = useNavigate();

  if (!request) return null;

  const handleRemove = async () => {
    try {
      if (mode === "talent") {
        // TALENT ACTION: Hide (archive) the request by adding their user_id to hidden_by_talents
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          toast.error("Authentication required");
          return;
        }

        // Fetch current hidden_by_talents array
        const { data: currentRequest, error: fetchError } = await supabase
          .from("event_requests")
          .select("hidden_by_talents")
          .eq("id", request.id)
          .maybeSingle();

        if (fetchError) throw fetchError;

        // Add current user to the array if not already present
        const currentHidden = currentRequest?.hidden_by_talents || [];
        if (!currentHidden.includes(user.id)) {
          const { error: updateError } = await supabase
            .from("event_requests")
            .update({
              hidden_by_talents: [...currentHidden, user.id]
            })
            .eq("id", request.id);

          if (updateError) throw updateError;
        }

        toast.success("Request hidden from your view");
        setShowRemoveDialog(false);
        if (onRemove) onRemove(request.id);
      } else if (mode === "booker" || mode === "admin") {
        // BOOKER/ADMIN ACTION: Permanent delete from database
        const { error } = await supabase
          .from("event_requests")
          .delete()
          .eq("id", request.id);

        if (error) throw error;

        toast.success("Request permanently deleted");
        setShowRemoveDialog(false);
        if (onRemove) onRemove(request.id);
      }
    } catch (error) {
      console.error("Error removing request:", error);
      toast.error(`Failed to ${mode === "talent" ? "hide" : "delete"} request`);
    }
  };

  const isBlurred = mode === "talent" && !isActionable;

  return (
    <Card className="overflow-hidden transition-all hover:shadow-md bg-card text-card-foreground relative">
      {/* Remove Button for Booker and Talent */}
      {(mode === "booker" || mode === "talent") && (
        <AlertDialog open={showRemoveDialog} onOpenChange={setShowRemoveDialog}>
          <AlertDialogTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="absolute top-2 right-2 h-8 w-8 p-0 hover:bg-destructive hover:text-destructive-foreground z-10"
          >
            {mode === "talent" ? <EyeOff className="h-4 w-4" /> : <Trash2 className="h-4 w-4" />}
          </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {mode === "talent" ? "Hide Request" : "Delete Request"}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {mode === "talent" 
                  ? "This will hide this event request from your dashboard. The request will remain visible to the booker and admin."
                  : "Are you sure you want to permanently delete this event request? This action cannot be undone."}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleRemove}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {mode === "talent" ? "Hide" : "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="mb-2 text-base font-semibold">
              <span className="capitalize">Event Type: {request.event_type}</span>
            </CardTitle>
            <p className="text-sm text-muted-foreground flex items-center">
              <Calendar className="inline h-4 w-4 mr-1.5" />
              {request.event_date ? format(new Date(request.event_date), "PPP") : "No date specified"}
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
            <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded">{request.description}</p>
          </div>
        )}

        {/* Pro Feature Upgrade Section for blurred content */}
        {isBlurred && (
          <div className="mb-2 p-2 bg-primary/5 dark:bg-primary/10 rounded border border-primary/20">
            <p className="text-[10px] text-muted-foreground mb-1 leading-tight flex items-center gap-1">
              <Crown className="h-3 w-3 text-primary" />
              <span>
                <strong>Pro:</strong> Unlock contact details & unlimited messaging
              </span>
            </p>
            <Button
              size="sm"
              onClick={() => navigate("/pricing")} // ✅ Same-tab safe navigation
              className="h-6 text-[10px] w-full"
              variant="default"
            >
              Upgrade
            </Button>
          </div>
        )}

        <div className="border-t pt-3 flex justify-between items-center">
          <div className="flex gap-2">
            {mode === "admin" && onRemove && (
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
            <AlertDialogAction
              onClick={handleRemove}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>

          <div>
            {mode === "booker" ? (
              <Button
                onClick={() => openChat(request.id, "event_request")}
                size="sm"
                variant="outline"
                className="relative"
              >
                <MessageCircle className="h-4 w-4 mr-2" />
                Chat with QTalent Team
                {unreadCount > 0 && (
                  <Badge
                    variant="destructive"
                    className="ml-2 h-5 w-5 p-0 flex items-center justify-center text-xs animate-pulse"
                  >
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </Badge>
                )}
              </Button>
            ) : (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span tabIndex={0}>
                      <Button
                        onClick={() => openChat(request.id, "event_request")}
                        size="sm"
                        disabled={!isActionable}
                        className={cn("relative", isBlurred && "opacity-50")}
                      >
                        <MessageCircle className="h-4 w-4 mr-2" />
                        Chat with Booker
                        {unreadCount > 0 && (
                          <Badge
                            variant="destructive"
                            className="ml-2 h-5 w-5 p-0 flex items-center justify-center text-xs animate-pulse"
                          >
                            {unreadCount > 9 ? "9+" : unreadCount}
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
