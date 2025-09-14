import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, X, Minimize2, Maximize2, Wifi, Send } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useRealtimeChat } from "@/hooks/useRealtimeChat";
import { useUnreadMessages } from "@/hooks/useUnreadMessages";
import { useToast } from "@/hooks/use-toast";
import { useOptimizedBookings } from "@/hooks/useOptimizedBookings";
//gemini sep 14
// Define a cleaner type for conversations
interface Conversation {
  id: string; // Will be the booking_id
  displayName: string;
  subText: string;
}

export function UniversalChat() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const { unreadCount } = useUnreadMessages();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Fetch raw booking data
  const { bookings, isProUser, loading } = useOptimizedBookings(user?.id);

  // Use the real-time chat hook with the selected conversation
  const { messages, sendMessage, isReady } = useRealtimeChat(selectedConversationId, user?.id);

  // Memoize and transform the raw bookings into a clean conversation list
  const conversations = useMemo<Conversation[]>(() => {
    if (!user || loading) return [];
    
    return bookings
      .filter(b => b.status !== 'declined' && b.status !== 'cancelled' && b.event_type !== 'admin_support')
      .map(booking => {
        // Determine if the current user is the talent for this booking
        const isUserTalent = booking.talent_id && booking.user_id !== user.id;
        const eventDate = booking.event_date ? new Date(booking.event_date).toLocaleDateString() : 'No date';

        return {
          id: booking.id,
          displayName: isUserTalent ? booking.booker_name : (booking as any).talent_profiles?.artist_name || 'Talent',
          subText: `${booking.event_type} • ${eventDate}`
        };
      });
  }, [bookings, user, loading]);
  
  // Set a default conversation when the list loads
  useEffect(() => {
    if (!selectedConversationId && conversations.length > 0) {
      setSelectedConversationId(conversations[0].id);
    }
  }, [conversations, selectedConversationId]);

  // Scroll to new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const onSend = useCallback(() => {
    if (!input.trim() || !selectedConversationId) return;
    sendMessage(input);
setInput("");
  }, [input, selectedConversationId, sendMessage]);

  const selectedConversation = conversations.find(c => c.id === selectedConversationId);

  return (
    <>
      {/* Floating Chat Button */}
      <div className="fixed bottom-4 right-4 z-50">
        <Button
          className="h-14 w-14 rounded-full shadow-lg"
          onClick={() => { setOpen(true); setMinimized(false); }}
          aria-label="Open chat"
        >
          <MessageCircle className="h-6 w-6" />
          {unreadCount > 0 && (
            <Badge variant="destructive" className="absolute -top-1 -right-1 h-6 w-6 rounded-full p-0 flex items-center justify-center">
              {unreadCount}
            </Badge>
          )}
        </Button>
      </div>

      {/* New Chat Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className={`fixed bottom-4 right-4 bg-card border rounded-lg shadow-xl overflow-hidden p-0 flex flex-col transition-all duration-300
          ${minimized ? 'h-[60px] w-[250px]' : 'h-[calc(100vh-2rem)] max-h-[600px] w-[90vw] max-w-[400px]'}`}>
          
          {/* Header */}
          <div className="flex items-center justify-between p-3 border-b shrink-0">
            <div className="flex items-center gap-2">
              <div className={`h-2 w-2 rounded-full ${isReady ? 'bg-green-500' : 'bg-yellow-500 animate-pulse'}`}></div>
              <h3 className="font-semibold text-sm">
                {minimized ? selectedConversation?.displayName || 'Live Chat' : 'Live Chat'}
              </h3>
            </div>
            <div className="flex items-center">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setMinimized(!minimized)}>
                {minimized ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          {!minimized && (
            <>
              {/* Conversation Selector */}
              <div className="p-3 border-b">
                <Select value={selectedConversationId ?? undefined} onValueChange={setSelectedConversationId}>
                  <SelectTrigger><SelectValue placeholder="Select a conversation..." /></SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>Booking Chats</SelectLabel>
                      {conversations.length > 0 ? conversations.map((convo) => (
                        <SelectItem key={convo.id} value={convo.id}>
                          <div className="flex flex-col">
                            <span>{convo.displayName}</span>
                            <span className="text-xs text-muted-foreground">{convo.subText}</span>
                          </div>
                        </SelectItem>
                      )) : <p className="text-xs text-muted-foreground p-2">No active bookings.</p>}
                    </SelectGroup>
                    <SelectGroup>
                       <SelectLabel>Support</SelectLabel>
                       <SelectItem value="admin_support_chat">QTalents Support</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>

              {/* Messages Area */}
              <ScrollArea className="flex-1 p-3">
                <div className="space-y-4">
                  {messages.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.senderId === user?.id ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[80%] px-3 py-2 rounded-xl text-sm
                        ${msg.senderId === user?.id ? 'bg-primary text-primary-foreground rounded-br-none' : 'bg-muted rounded-bl-none'}`}>
                        {msg.content}
                      </div>
                    </div>
                  ))}
                </div>
                <div ref={messagesEndRef} />
              </ScrollArea>

              {/* Input Area */}
              <div className="p-3 border-t">
                <div className="relative">
                  <Textarea
                    placeholder="Type your message..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSend(); } }}
                    className="pr-12 resize-none"
                    rows={1}
                    disabled={!selectedConversationId || !isReady}
                  />
                  <Button
                    type="submit"
                    size="icon"
                    className="absolute bottom-1.5 right-1.5 h-8 w-8"
                    onClick={onSend}
                    disabled={!input.trim() || !selectedConversationId || !isReady}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}