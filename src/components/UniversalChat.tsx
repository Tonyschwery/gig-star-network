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
      {/* Professional floating chat button */}
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          className="h-16 w-16 rounded-full shadow-elevated bg-accent hover:bg-accent/90 border-2 border-accent/30 hover:border-accent/50 transition-all duration-300 hover:scale-105 group"
          onClick={() => {
            setOpen(true);
            setMinimized(false);
          }}
          aria-label="Open chat"
        >
          <MessageCircle className="h-7 w-7 text-accent-foreground group-hover:scale-110 transition-transform duration-200" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0 text-xs font-bold flex items-center justify-center shadow-card border-2 border-card animate-live-pulse"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </div>

      {/* Professional Chat Interface */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className={`${
          minimized 
            ? 'h-[400px] w-[350px] sm:w-[380px]' 
            : 'h-[80vh] max-h-[700px] w-[95vw] max-w-[500px] sm:max-w-[550px] lg:max-w-[600px]'
        } flex flex-col p-0 transition-all duration-300 fixed bottom-6 right-6 sm:bottom-28 sm:right-6 translate-x-0 translate-y-0 bg-card border border-border shadow-elevated rounded-2xl overflow-hidden`}>
          
          {/* Modern Header */}
          <div className="flex items-center justify-between p-4 bg-card border-b border-border">
            <div className="flex items-center gap-3">
              <div className="h-2 w-2 bg-accent rounded-full animate-live-pulse"></div>
              <DialogTitle className="text-lg font-semibold text-card-foreground">
                {minimized ? 'Messages' : 'Live Chat'}
              </DialogTitle>
            </div>
            <div className="flex items-center gap-1">
              {selectedId && !minimized && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={removeBookingFromChat}
                  className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full"
                  title="Remove this event request from chat"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setMinimized(!minimized)}
                className="h-8 w-8 p-0 text-muted-foreground hover:text-card-foreground hover:bg-muted/50 rounded-full"
                title={minimized ? 'Maximize' : 'Minimize'}
              >
                {minimized ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setOpen(false)}
                className="h-8 w-8 p-0 text-muted-foreground hover:text-card-foreground hover:bg-muted/50 rounded-full"
                title="Close"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          {/* Event Selector (only in full view) */}
          {!minimized && (
            <div className="p-3 bg-muted/30 border-b border-border">
              <Select value={selectedId ?? undefined} onValueChange={(v) => setSelectedId(v)}>
                <SelectTrigger className="w-full bg-card border-border text-card-foreground hover:bg-muted/50 transition-colors">
                  <SelectValue placeholder="Select an event to chat about" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border shadow-elevated">
                  {bookings.map((b) => (
                    <SelectItem 
                      key={b.id} 
                      value={b.id} 
                      className="text-card-foreground hover:bg-muted/50 focus:bg-muted/50"
                    >
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 bg-accent rounded-full"></div>
                        <span className="font-medium">{b.event_type}</span>
                        <span className="text-muted-foreground">•</span>
                        <span className="text-muted-foreground">{b.booker_name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          
          {/* Messages Area */}
          <ScrollArea className={`flex-1 ${minimized ? 'h-64' : 'max-h-96'}`}>
            <div className="p-4 space-y-4">
              {!selectedId ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="h-16 w-16 bg-muted/50 rounded-full flex items-center justify-center mb-4">
                    <MessageCircle className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-card-foreground font-medium mb-2">
                    {minimized ? 'Select Event' : 'Choose an event to start chatting'}
                  </h3>
                  <p className="text-muted-foreground text-sm">
                    {minimized ? 'Open full view to select' : 'Pick an event request from the dropdown above'}
                  </p>
                </div>
              ) : (
                <>
                  {messages.map((m, index) => (
                    <div 
                      key={m.id} 
                      className={`flex ${m.senderId === user?.id ? 'justify-end' : 'justify-start'} animate-fadeIn`}
                      style={{ animationDelay: `${index * 0.1}s` }}
                    >
                      <div className={`relative max-w-[80%] sm:max-w-[75%] group ${
                        m.senderId === user?.id ? 'ml-4' : 'mr-4'
                      }`}>
                        <div className={`px-4 py-3 text-sm shadow-minimal transition-all duration-200 group-hover:shadow-card ${
                          m.senderId === user?.id 
                            ? 'bg-accent text-accent-foreground rounded-2xl rounded-br-md' 
                            : 'bg-muted border border-border text-card-foreground rounded-2xl rounded-bl-md'
                        }`}>
                          <div className="break-words leading-relaxed">{m.content}</div>
                        </div>
                        <div className={`text-[11px] text-muted-foreground mt-1 px-1 ${
                          m.senderId === user?.id ? 'text-right' : 'text-left'
                        }`}>
                          {new Date(m.createdAt).toLocaleTimeString([], { 
                            hour: '2-digit', 
                            minute: '2-digit',
                            hour12: true 
                          })}
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {!messages.length && (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <div className="h-16 w-16 bg-accent/10 rounded-full flex items-center justify-center mb-4">
                        <MessageCircle className="h-8 w-8 text-accent" />
                      </div>
                      <h3 className="text-card-foreground font-medium mb-2">Start the conversation</h3>
                      <p className="text-muted-foreground text-sm">Send your first message below</p>
                    </div>
                  )}
                </>
              )}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>
          
          {/* Modern Input Area (only in full view) */}
          {!minimized && (
            <div className="p-4 bg-muted/20 border-t border-border">
              <div className="flex items-end gap-3">
                <div className="flex-1">
                  <Textarea
                    placeholder={!selectedId ? 'Select an event to start chatting' : (isReady ? 'Type a message...' : 'Connecting...')}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        onSend();
                      }
                    }}
                    className="min-h-[44px] max-h-32 bg-card border-border text-card-foreground placeholder:text-muted-foreground resize-none rounded-xl focus:ring-2 focus:ring-accent/20 focus:border-accent/50 transition-all duration-200"
                    disabled={!selectedId || !isReady}
                    rows={1}
                  />
                </div>
                <Button 
                  onClick={onSend} 
                  disabled={!input.trim() || !selectedId || !isReady}
                  className="bg-accent hover:bg-accent/90 text-accent-foreground px-6 py-3 rounded-xl shadow-minimal hover:shadow-card transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Send
                </Button>
              </div>
              
              {/* Connection Status */}
              <div className="flex items-center justify-center mt-2">
                <div className={`flex items-center gap-2 text-xs ${
                  isReady ? 'text-accent' : 'text-muted-foreground'
                }`}>
                  <div className={`h-1.5 w-1.5 rounded-full ${
                    isReady ? 'bg-accent animate-live-pulse' : 'bg-muted-foreground'
                  }`}></div>
                  {isReady ? 'Connected' : 'Connecting...'}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
