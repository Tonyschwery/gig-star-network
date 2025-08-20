import { useEffect, useMemo, useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, X, Trash2, Minimize2, Maximize2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useRealtimeChat } from "@/hooks/useRealtimeChat";
import { useChatFilter } from "@/hooks/useChatFilter";
import { useUnreadMessages } from "@/hooks/useUnreadMessages";
import { useToast } from "@/hooks/use-toast";
import { useWebPushNotifications } from "@/hooks/useWebPushNotifications";

interface BookingLite {
  id: string;
  user_id: string;
  talent_id: string | null;
  event_type: string;
  booker_name: string;
}

export function UniversalChat() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [bookings, setBookings] = useState<BookingLite[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const { filterMessage } = useChatFilter();
  const { unreadCount } = useUnreadMessages();
  const { showNotification, requestPermission } = useWebPushNotifications();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const previousMessageCountRef = useRef(0);

  useEffect(() => {
    const load = async () => {
      if (!user) return;
      // Fetch bookings where the user is the booker
      const { data: asBooker } = await supabase
        .from('bookings')
        .select('id, user_id, talent_id, event_type, booker_name')
        .eq('user_id', user.id)
        .not('talent_id', 'is', null)
        .order('created_at', { ascending: false })
        .limit(20);

      // Fetch bookings where the user is the talent
      const { data: talentProfile } = await supabase
        .from('talent_profiles')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      let asTalent: BookingLite[] = [];
      if (talentProfile?.id) {
        const { data } = await supabase
          .from('bookings')
          .select('id, user_id, talent_id, event_type, booker_name')
          .eq('talent_id', talentProfile.id)
          .order('created_at', { ascending: false })
          .limit(20);
        asTalent = (data as any) || [];
      }

      const merged = [...((asBooker as any) || []), ...asTalent];
      setBookings(merged as BookingLite[]);
      if (!selectedId && merged.length) setSelectedId(merged[0].id);
    };
    load();
  }, [user?.id]);

  const selectedBooking = useMemo(() => bookings.find(b => b.id === selectedId) || null, [bookings, selectedId]);

  const { messages, sendMessage, isReady } = useRealtimeChat(selectedId, user?.id);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > previousMessageCountRef.current && open && !minimized) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
    previousMessageCountRef.current = messages.length;
  }, [messages, open, minimized]);

  // Auto-show chat when new messages arrive and show web push notification
  useEffect(() => {
    if (messages.length > previousMessageCountRef.current && !open && unreadCount > 0) {
      setMinimized(true);
      setOpen(true);
      
      // Show web push notification for new messages
      if (messages.length > 0) {
        const latestMessage = messages[messages.length - 1];
        if (latestMessage?.senderId !== user?.id) {
          showNotification(
            'New Message',
            `${selectedBooking?.booker_name || 'Someone'}: ${latestMessage?.content.substring(0, 50)}${latestMessage?.content.length > 50 ? '...' : ''}`
          );
        }
      }
    }
  }, [messages.length, open, unreadCount, showNotification, selectedBooking, user?.id, messages]);

  const onSend = () => {
    if (!input.trim()) return;
    
    // Filter the message before sending
    const filterResult = filterMessage(input);
    
    if (filterResult.isBlocked) {
      toast({
        title: "Message Blocked",
        description: filterResult.reason,
        variant: "destructive",
      });
      return;
    }

    sendMessage(input);
    setInput("");
  };

  const removeBookingFromChat = () => {
    if (!selectedId) return;
    
    // Remove the booking from the local state
    setBookings(prev => prev.filter(b => b.id !== selectedId));
    
    // Select the first remaining booking or null
    const remainingBookings = bookings.filter(b => b.id !== selectedId);
    setSelectedId(remainingBookings.length > 0 ? remainingBookings[0].id : null);
    
    toast({
      title: "Event Request Removed",
      description: "This event request has been removed from your chat list.",
    });
  };

  // Request notification permission on first render
  useEffect(() => {
    requestPermission();
  }, [requestPermission]);

  return (
    <>
      {/* Large modern floating button with smooth glow */}
      <Button
        className="fixed bottom-6 right-6 rounded-full shadow-elevated relative z-50 h-20 w-20 bg-accent hover:bg-accent/90 border-4 border-accent/20 animate-live-glow hover:animate-none transition-all duration-500 hover:scale-105"
        onClick={() => {
          setOpen(true);
          setMinimized(false);
        }}
        aria-label="Open chat"
      >
        <MessageCircle className="h-10 w-10 text-accent-foreground" />
        {unreadCount > 0 && (
          <Badge 
            variant="destructive" 
            className="absolute -top-3 -right-3 h-8 w-8 rounded-full p-0 text-sm font-bold flex items-center justify-center shadow-live animate-live-pulse border-2 border-background"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </Badge>
        )}
      </Button>

      {/* Modern Chat Dialog with proper visibility */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className={`${
          minimized ? 'h-[350px] w-[380px]' : 'h-[75vh] w-[95vw] sm:w-[650px]'
        } flex flex-col p-0 transition-all duration-300 fixed bottom-28 right-6 translate-x-0 translate-y-0 bg-background border border-border shadow-elevated`}>
          <DialogHeader className="p-4 border-b border-border bg-background flex-row items-center justify-between">
            <DialogTitle className="text-lg font-semibold text-foreground">
              {minimized ? 'Messages' : 'Chat'}
            </DialogTitle>
            <div className="flex items-center gap-2">
              {selectedId && !minimized && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={removeBookingFromChat}
                  className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                  title="Remove this event request from chat"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setMinimized(!minimized)}
                className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                title={minimized ? 'Maximize' : 'Minimize'}
              >
                {minimized ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setOpen(false)}
                className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                title="Close"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DialogHeader>
          
          {!minimized && (
            <>
              <div className="p-4 border-b border-border bg-background flex items-center gap-2">
                <Select value={selectedId ?? undefined} onValueChange={(v) => setSelectedId(v)}>
                  <SelectTrigger className="w-full bg-background border-border text-foreground">
                    <SelectValue placeholder="Select an event request" />
                  </SelectTrigger>
                  <SelectContent className="bg-background border-border">
                    {bookings.map((b) => (
                      <SelectItem key={b.id} value={b.id} className="text-foreground">
                        {b.event_type} • {b.booker_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}
          <ScrollArea className={`flex-1 p-4 bg-background ${minimized ? 'h-48' : ''}`}>
            {!selectedId ? (
              <div className="text-sm text-muted-foreground text-center py-8">
                {minimized ? 'Select an event request in full view' : 'Select an event request to start chatting.'}
              </div>
            ) : (
              <div className="space-y-3">
                {messages.map((m) => (
                  <div key={m.id} className={`flex ${m.senderId === user?.id ? 'justify-end' : 'justify-start'}`}>
                    <div className={`px-4 py-3 rounded-2xl max-w-[75%] text-sm shadow-minimal transition-all hover:shadow-card ${
                      m.senderId === user?.id 
                        ? 'bg-primary text-primary-foreground' 
                        : 'bg-muted border border-border text-foreground'
                    }`}>
                      <div className="break-words">{m.content}</div>
                      <div className="text-[10px] opacity-70 mt-1 text-right">
                        {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                ))}
                {!messages.length && (
                  <div className="text-sm text-muted-foreground text-center py-8">
                    <MessageCircle className="h-12 w-12 mx-auto mb-2 opacity-40" />
                    No messages yet. Start the conversation!
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </ScrollArea>
          
          {!minimized && (
            <div className="p-4 border-t border-border bg-background flex items-center gap-3">
              <Textarea
                placeholder={!selectedId ? 'Select an event request to chat' : (isReady ? 'Type your message…' : 'Connecting…')}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    onSend();
                  }
                }}
                className="min-h-[44px] max-h-40 bg-background border-border text-foreground placeholder:text-muted-foreground resize-none"
                disabled={!selectedId || !isReady}
              />
              <Button 
                onClick={onSend} 
                disabled={!input.trim() || !selectedId || !isReady}
                className="bg-primary hover:bg-primary/90 text-primary-foreground px-6"
              >
                Send
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
