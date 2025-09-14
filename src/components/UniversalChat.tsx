import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { X, Send, ArrowLeft } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useRealtimeChat } from "@/hooks/useRealtimeChat";
import { useOptimizedBookings } from "@/hooks/useOptimizedBookings";
import { useChat } from "@/contexts/ChatContext";
//gemini14
export function UniversalChat() {
  const { user } = useAuth();
  const { isChatOpen, closeChat, activeBookingId } = useChat();
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const { bookings, loading } = useOptimizedBookings(user?.id);
  const { messages, sendMessage, isReady } = useRealtimeChat(activeBookingId, user?.id);

  const activeConversation = useMemo(() => {
    if (!activeBookingId || loading || !user) return null;
    
    const booking = bookings.find(b => b.id === activeBookingId);
    if (!booking) return null;

    const isUserTalent = booking.talent_id && booking.user_id !== user.id;
    const talentName = (booking as any).talent_profiles?.artist_name || 'The Talent';

    return {
      displayName: isUserTalent ? booking.booker_name : talentName,
      subText: `${booking.event_type} • ${booking.event_date ? new Date(booking.event_date).toLocaleDateString() : 'No date'}`
    };
  }, [activeBookingId, bookings, user, loading]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const onSend = useCallback(() => {
    if (!input.trim() || !activeBookingId) return;
    sendMessage(input);
    setInput("");
  }, [input, activeBookingId, sendMessage]);

  // If chat is not open, render nothing. This removes the floating button.
  if (!isChatOpen) {
    return null;
  }

  return (
    <Dialog open={isChatOpen} onOpenChange={closeChat}>
      <DialogContent className="fixed bottom-4 right-4 bg-card border rounded-lg shadow-xl overflow-hidden p-0 flex flex-col h-[calc(100vh-2rem)] max-h-[600px] w-[90vw] max-w-[400px]">
        
        <div className="flex items-center justify-between p-3 border-b shrink-0">
          {activeConversation ? (
            <div className="flex items-center gap-3">
              <ArrowLeft className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="font-semibold">{activeConversation.displayName}</p>
                <p className="text-xs text-muted-foreground">{activeConversation.subText}</p>
              </div>
            </div>
          ) : (
            <p className="font-semibold">Loading Chat...</p>
          )}
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={closeChat}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        <ScrollArea className="flex-1 p-3 bg-muted/20">
          <div className="space-y-4">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex items-end gap-2 ${msg.senderId === user?.id ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] px-3 py-2 rounded-xl text-sm ${msg.senderId === user?.id ? 'bg-primary text-primary-foreground rounded-br-none' : 'bg-background border rounded-bl-none'}`}>
                  {msg.content}
                </div>
              </div>
            ))}
          </div>
          <div ref={messagesEndRef} />
        </ScrollArea>

        <div className="p-3 border-t">
          <div className="relative">
            <Textarea
              placeholder="Type your message..."
              value={input}
              onChange={(e) => setInput(e.e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSend(); } }}
              className="pr-12 resize-none"
              rows={1}
              disabled={!activeBookingId || !isReady}
            />
            <Button
              type="submit"
              size="icon"
              className="absolute bottom-1.5 right-1.5 h-8 w-8"
              onClick={onSend}
              disabled={!input.trim() || !activeBookingId || !isReady}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

