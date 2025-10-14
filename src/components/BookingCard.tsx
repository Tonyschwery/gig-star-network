// FILE: src/components/BookingCard.tsx

import React, { useState } from "react";
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
import { supabase } from "@/integrations/supabase/client";
import { Calendar, Check, X, Clock3, MessageCircle, Crown, Trash2, Headset, HelpCircle } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useChat } from "@/contexts/ChatContext";
import { useTalentBookingLimit } from "@/hooks/useTalentBookingLimit";
import { useNavigate } from "react-router-dom";
import { useIndividualUnreadCount } from "@/hooks/useIndividualUnreadCount";

export interface Booking {
  id: string;
  booker_name: string;
  booker_email?: string;
  booker_phone?: string;
  event_date: string;
  event_duration: number;
  event_location: string;
  event_address: string;
  description?: string;
  status: string;
  user_id: string;
  talent_id?: string;
  talent_profiles?: { artist_name: string };
  event_type: string;
}

interface BookingCardProps {
  booking: Booking;
  mode: "talent" | "booker" | "admin";
  onUpdate?: () => void;
  onRemove?: (bookingId: string) => void;
  shouldBlurContact?: boolean;
}

export const BookingCard = ({ booking, mode, onUpdate, onRemove, shouldBlurContact = false }: BookingCardProps) => {
  const navigate = useNavigate(); // ✅ Only once — correctly placed here
  const { toast } = useToast();
  const { openChat } = useChat();
  const { canReceiveBooking, isProUser } = useTalentBookingLimit();
  const { unreadCount } = useIndividualUnreadCount(booking.id, 'booking');
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);

  // Safety check
  if (!booking) return null;

  const handleRemove = async () => {
    try {
      const { error } = await supabase.from("bookings").delete().eq("id", booking.id);
      if (error) throw new Error(error.message);
      toast({ title: "Booking removed" });
      setShowRemoveDialog(false);
      onRemove?.(booking.id);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const getStatusBadgeVariant = (status: string): "default" | "secondary" | "outline" | "destructive" => {
    switch (status) {
      case "confirmed":
        return "default";
      case "pending":
        return "secondary";
      case "cancelled":
      case "declined":
        return "destructive";
      default:
        return "outline";
    }
  };

  // Check if this is an admin support chat
  const isAdminSupport = booking.event_type === "admin_support";

  // Render special card for admin support
  if (isAdminSupport) {
    return (
      <div className="border-2 border-primary/30 rounded-lg p-5 bg-gradient-to-br from-primary/5 via-primary/3 to-background space-y-3 transition-all hover:shadow-lg hover:border-primary/50">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Headset className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-lg text-foreground">QTalents Support Chat</h3>
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
                Live Support
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Need help or have questions? Our support team is here to assist you. Chat with us directly and we'll respond as soon as possible.
            </p>
          </div>
        </div>

        <div className="border-t border-primary/10 pt-3 space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <HelpCircle className="h-4 w-4 text-primary" />
            <span>Typical response time: Within 24 hours</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MessageCircle className="h-4 w-4 text-primary" />
            <span>Available for questions, technical support, or booking assistance</span>
          </div>
        </div>

        <div className="pt-2 border-t border-primary/10">
          <Button 
            onClick={() => openChat(booking.id, "booking")} 
            className="w-full" 
            size="lg"
          >
            <MessageCircle className="h-4 w-4 mr-2" />
            Start Support Chat
            {unreadCount > 0 && (
              <Badge
                variant="destructive"
                className="ml-2 h-5 w-5 p-0 flex items-center justify-center text-xs animate-pulse"
              >
                {unreadCount > 9 ? "9+" : unreadCount}
              </Badge>
            )}
          </Button>
        </div>
      </div>
    );
  }

  // Regular booking card
  return (
    <div className="border rounded-lg p-4 bg-card text-card-foreground space-y-3 transition-all hover:shadow-md">
      <div className="flex justify-between items-start">
        <div className="flex flex-col gap-2">
          <h3 className="font-semibold capitalize text-foreground">Event Type: {booking.event_type}</h3>
          <div className="text-sm text-muted-foreground flex items-center">
            <Calendar className="inline h-4 w-4 mr-2" />
            {booking.event_date ? format(new Date(booking.event_date), "PPP") : "No date"}
          </div>
          <div className="text-sm text-muted-foreground flex items-center">
            <Clock3 className="inline h-4 w-4 mr-2" />
            {booking.event_duration} hours
          </div>
        </div>
        {booking.status !== "pending" && (
          <Badge variant={getStatusBadgeVariant(booking.status)} className="capitalize">
            {booking.status}
          </Badge>
        )}
      </div>

      <div className="border-t pt-3 space-y-2">
        <div className="text-sm text-foreground">
          {mode === "talent" ? (
            <>
              <strong>Booker Name:</strong> <span className="text-muted-foreground">{booking.booker_name}</span>
            </>
          ) : (
            <>
              <strong>Talent:</strong>{" "}
              <span className="text-muted-foreground">{booking.talent_profiles?.artist_name || "N/A"}</span>
            </>
          )}
        </div>

        {booking.booker_email && mode !== "booker" && (
          <div className="text-sm text-foreground">
            <strong>Booker Email:</strong>
            {mode === "talent" && shouldBlurContact && !isProUser ? (
              <span className="text-muted-foreground blur-sm">••••••@••••.com</span>
            ) : (
              <span className="text-muted-foreground">{booking.booker_email}</span>
            )}
          </div>
        )}

        {booking.booker_phone && mode !== "booker" && (
          <div className="text-sm text-foreground">
            <strong>Booker Phone:</strong>
            {mode === "talent" && shouldBlurContact && !isProUser ? (
              <span className="text-muted-foreground blur-sm">+•• ••• ••• •••</span>
            ) : (
              <span className="text-muted-foreground">{booking.booker_phone}</span>
            )}
          </div>
        )}

        {mode === "talent" && shouldBlurContact && !isProUser && (booking.booker_email || booking.booker_phone) && (
          <div className="mt-2 p-2 bg-primary/5 dark:bg-primary/10 rounded border border-primary/20">
            <p className="text-[10px] text-muted-foreground mb-1 leading-tight flex items-center gap-1">
              <Crown className="h-3 w-3 text-primary" />
              <span>
                <strong>Pro:</strong> Unlock contact details & start earning
              </span>
            </p>
            <Button
              size="sm"
              onClick={() => navigate("/pricing")} // ✅ safe client-side navigation
              className="h-6 text-[10px] w-full"
              variant="default"
            >
              Upgrade
            </Button>
          </div>
        )}

        <div className="text-sm text-foreground">
          <strong>Event Location:</strong> <span className="text-muted-foreground">{booking.event_location}</span>
        </div>

        {booking.event_address && (
          <div className="text-sm text-foreground">
            <strong>Event Address:</strong> <span className="text-muted-foreground">{booking.event_address}</span>
          </div>
        )}

        {booking.description && (
          <div className="text-sm text-foreground">
            <strong>Event Description:</strong> <span className="text-muted-foreground">{booking.description}</span>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2 pt-2 border-t mt-2">
        <Button onClick={() => openChat(booking.id, "booking")} variant="outline" size="sm" className="relative">
          <MessageCircle className="h-4 w-4 mr-2" />
          Chat
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs animate-pulse"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>

        {mode === "admin" && (
          <AlertDialog open={showRemoveDialog} onOpenChange={setShowRemoveDialog}>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm">
                <Trash2 className="h-4 w-4 mr-2" />
                Remove
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Remove Booking</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to remove this booking? This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleRemove}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Remove
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
    </div>
  );
};
