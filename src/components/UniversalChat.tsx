import { useEffect, useMemo, useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, X, Minimize2, Maximize2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useRealtimeChat } from "@/hooks/useRealtimeChat";
import { useChatFilterPro } from "@/hooks/useChatFilterPro";
import { useUnreadMessages } from "@/hooks/useUnreadMessages";
import { useToast } from "@/hooks/use-toast";
import { useWebPushNotifications } from "@/hooks/useWebPushNotifications";

interface BookingLite {
  id: string;
  user_id: string;
  talent_id: string | null;
  event_type: string;
  booker_name: string;
  booker_email?: string;
  event_date?: string;
  status?: string;
}

interface UniversalChatProps {
  openWithBooking?: string;
}

export function UniversalChat({ openWithBooking }: UniversalChatProps = {}) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [bookings, setBookings] = useState<BookingLite[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [isProUser, setIsProUser] = useState(false);
  const [talentProStatus, setTalentProStatus] = useState<{[key: string]: boolean}>({});
  const { filterMessage } = useChatFilterPro(false); // We'll set this dynamically
  const { unreadCount } = useUnreadMessages();
  const { showNotification, requestPermission } = useWebPushNotifications();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const previousMessageCountRef = useRef(0);

  useEffect(() => {
    const load = async () => {
      if (!user) return;
      
      // Check if user is Pro subscriber
      const { data: talentProfile } = await supabase
        .from('talent_profiles')
        .select('id, is_pro_subscriber')
        .eq('user_id', user.id)
        .maybeSingle();
      
      setIsProUser(talentProfile?.is_pro_subscriber || false);
      
      // Fetch bookings where the user is the booker
      const { data: asBooker } = await supabase
        .from('bookings')
        .select('id, user_id, talent_id, event_type, booker_name, booker_email, event_date, status')
        .eq('user_id', user.id)
        .not('talent_id', 'is', null)
        .order('created_at', { ascending: false })
        .limit(20);

      // Fetch bookings where the user is the talent
      let asTalent: BookingLite[] = [];
      if (talentProfile?.id) {
        const { data } = await supabase
          .from('bookings')
          .select('id, user_id, talent_id, event_type, booker_name, booker_email, event_date, status')
          .eq('talent_id', talentProfile.id)
          .order('created_at', { ascending: false })
          .limit(20);
        asTalent = (data as any) || [];
      }

      let merged = [...((asBooker as any) || []), ...asTalent];
      
      // Create or fetch QTalents Support booking for this user
      const { data: supportBookingId, error: supportError } = await supabase.rpc('create_admin_support_booking', {
        user_id_param: user.id
      });

      if (!supportError && supportBookingId) {
        // Add QTalents Support booking to the list
        const supportBooking: BookingLite = {
          id: supportBookingId,
          user_id: user.id,
          talent_id: null,
          event_type: 'admin_support',
          booker_name: 'QTalents Support',
        };
        merged = [supportBooking, ...merged];
      }
      
      // Fetch talent Pro status for each booking to determine chat filtering
      const talentStatusMap: {[key: string]: boolean} = {};
      
      for (const booking of merged) {
        if (booking.talent_id && !talentStatusMap[booking.talent_id]) {
          const { data: talentData } = await supabase
            .from('talent_profiles')
            .select('is_pro_subscriber')
            .eq('id', booking.talent_id)
            .maybeSingle();
          
          talentStatusMap[booking.talent_id] = talentData?.is_pro_subscriber || false;
        }
      }
      
      setTalentProStatus(talentStatusMap);
      
      // Extend the bookings with talent Pro status for filtering
      const bookingsWithProStatus = merged.map(booking => ({
        ...booking,
        talentProStatus: booking.talent_id ? talentStatusMap[booking.talent_id] || false : true // Admin support is always available
      }));

      // Filter out declined/expired bookings and non-Pro talent chats
      const filteredBookings = bookingsWithProStatus.filter(booking => {
        // Always include QTalents Support
        if (booking.event_type === 'admin_support') return true;
        
        // Filter out declined or expired bookings
        if (booking.status === 'declined') return false;
        if (booking.status === 'completed' && booking.event_date && new Date(booking.event_date) < new Date()) return false;
        
        // Filter out chats for non-Pro talents
        if (!booking.talentProStatus) return false;
        
        return true;
      });

      setBookings(filteredBookings);
      if (!selectedId && filteredBookings.length) {
        // If openWithBooking is provided and exists in the list, select it
        if (openWithBooking && filteredBookings.find(b => b.id === openWithBooking)) {
          setSelectedId(openWithBooking);
        } else {
          setSelectedId(filteredBookings[0].id);
        }
      }
    };
    load();
  }, [user?.id, openWithBooking]);

  // Real-time subscription for booking status changes
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`booking-status-updates-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'bookings'
        },
        (payload) => {
          const updatedBooking = payload.new as any;
          
          // Check if this booking involves the current user
          const isUserBooking = updatedBooking.user_id === user.id;
          
          // Check if this is a talent booking (we'll need to compare with talent profile)
          setBookings(prevBookings => {
            const existingBooking = prevBookings.find(b => b.id === updatedBooking.id);
            if (!existingBooking) return prevBookings;
            
            // If booking was declined, remove it from the list
            if (updatedBooking.status === 'declined') {
              const filtered = prevBookings.filter(b => b.id !== updatedBooking.id);
              // If this was the selected booking, select the first available one
              if (selectedId === updatedBooking.id && filtered.length > 0) {
                setSelectedId(filtered[0].id);
              }
              return filtered;
            }
            
            // Otherwise update the booking status
            return prevBookings.map(b => 
              b.id === updatedBooking.id 
                ? { ...b, status: updatedBooking.status }
                : b
            );
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, selectedId]);

  // Open chat when openWithBooking prop changes
  useEffect(() => {
    if (openWithBooking) {
      // Force open the chat even if booking isn't loaded yet
      setOpen(true);
      setMinimized(false);
      
      // Check if booking exists in current list
      const targetBooking = bookings.find(b => b.id === openWithBooking);
      if (targetBooking) {
        setSelectedId(openWithBooking);
      }
    }
  }, [openWithBooking, bookings]);

  // Listen for custom events to open chat with specific booking
  useEffect(() => {
    const handleOpenChat = (event: CustomEvent) => {
      const { bookingId } = event.detail;
      const targetBooking = bookings.find(b => b.id === bookingId);
      if (targetBooking) {
        setSelectedId(bookingId);
        setOpen(true);
        setMinimized(false);
      }
    };

    window.addEventListener('openChatWithBooking', handleOpenChat as EventListener);
    return () => window.removeEventListener('openChatWithBooking', handleOpenChat as EventListener);
  }, [bookings]);

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
    if (!input.trim() || !selectedBooking) return;
    
    // Determine if chat filtering should be applied based on talent's Pro status
    const talentId = selectedBooking.talent_id;
    const isTalentPro = talentId ? talentProStatus[talentId] || false : false;
    
    // Apply filtering only if talent is NOT Pro
    if (!isTalentPro) {
      // Use the existing filterMessage but ensure it's configured for non-pro
      const filterResult = filterMessage(input);
      
      if (filterResult.isBlocked) {
        // Determine if current user is booker or talent in this conversation
        const isUserBooker = selectedBooking.user_id === user?.id;
        
        toast({
          title: "Message Blocked",
          description: isUserBooker 
            ? "Message filtered because talent is not Pro" 
            : filterResult.reason + " Subscribe to Pro to unlock messaging",
          variant: "destructive",
        });
        return;
      }
    }

    sendMessage(input);
    setInput("");
  };

  // Request notification permission on first render
  useEffect(() => {
    requestPermission();
  }, [requestPermission]);

  return (
    <>
      {/* Floating chat button - Position higher on mobile to avoid hamburger menu */}
      <div className="fixed bottom-20 md:bottom-4 right-4 z-50">
        <Button
          className="h-14 w-14 rounded-full bg-accent hover:bg-accent/90 border border-border"
          onClick={() => {
            setOpen(true);
            setMinimized(false);
          }}
          aria-label="Open chat"
        >
          <MessageCircle className="h-6 w-6 text-accent-foreground" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 text-xs font-bold flex items-center justify-center"
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
            : 'h-[500px] sm:h-[600px] w-[95vw] max-w-[420px]'
        } fixed bottom-4 right-4 bg-card border border-border/50 rounded-2xl overflow-hidden shadow-elevated`}>
          
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-card to-card/80 border-b border-border/50 shrink-0">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="h-2 w-2 bg-accent rounded-full animate-pulse"></div>
                  <div className="absolute inset-0 h-2 w-2 bg-accent rounded-full animate-ping"></div>
                </div>
                <DialogTitle className="text-base font-semibold text-card-foreground">
                  {minimized ? 'Messages' : 'Live Chat'}
                </DialogTitle>
                {unreadCount > 0 && (
                  <Badge variant="destructive" className="h-5 px-2 text-xs">
                    {unreadCount}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setMinimized(!minimized)}
                  className="h-8 w-8 p-0 text-muted-foreground hover:text-card-foreground hover:bg-muted/50"
                  title={minimized ? 'Expand chat' : 'Minimize chat'}
                >
                  {minimized ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setOpen(false)}
                  className="h-8 w-8 p-0 text-muted-foreground hover:text-card-foreground hover:bg-muted/50"
                  title="Close chat"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            {/* Event Selector (only in full view) */}
            {!minimized && (
              <div className="p-3 bg-muted/30 border-b border-border shrink-0">
                <Select value={selectedId ?? undefined} onValueChange={(v) => setSelectedId(v)}>
                  <SelectTrigger className="w-full bg-card border-border text-card-foreground text-sm h-9">
                    <SelectValue placeholder="Select an event or support chat..." />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    {bookings.map((b) => {
                      // Check if current user is talent for this booking
                      const isTalentForBooking = b.talent_id && b.user_id !== user?.id;
                      
                      return (
                        <SelectItem 
                          key={b.id} 
                          value={b.id} 
                          className="text-card-foreground text-sm"
                        >
                           <div className="flex items-center gap-2">
                             <div className="h-1.5 w-1.5 bg-accent rounded-full"></div>
                             {b.event_type === 'admin_support' ? (
                               <>
                                 <span className="font-medium">🎯 QTalents Support</span>
                                 <span className="text-muted-foreground text-xs">• Direct support chat</span>
                               </>
                             ) : (
                               <>
                                 <span className="font-medium">{b.event_type}</span>
                                 <span className="text-muted-foreground">•</span>
                                 <span className="text-muted-foreground">{b.booker_name}</span>
                                 {/* Only show additional details if user is Pro (when they are the talent) */}
                                 {isTalentForBooking && isProUser && b.event_date && (
                                   <>
                                     <span className="text-muted-foreground">•</span>
                                     <span className="text-muted-foreground text-xs">
                                       {new Date(b.event_date).toLocaleDateString()}
                                     </span>
                                   </>
                                 )}
                                 {/* For free users acting as talent, show limited info */}
                                 {isTalentForBooking && !isProUser && (
                                   <>
                                     <span className="text-muted-foreground">•</span>
                                     <span className="text-muted-foreground text-xs">Pro Feature</span>
                                   </>
                                 )}
                               </>
                             )}
                           </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            )}
            
            {/* Messages Area */}
            <div className="flex-1 min-h-0">
              <ScrollArea className="h-full">
                <div className="p-3 space-y-3">
                  {!selectedId ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <div className="h-12 w-12 bg-muted/50 rounded-full flex items-center justify-center mb-3">
                        <MessageCircle className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <h3 className="text-card-foreground font-medium mb-1 text-sm">
                        {minimized ? 'Select Event' : 'Choose an event to start chatting'}
                      </h3>
                      <p className="text-muted-foreground text-xs">
                        {minimized ? 'Open full view to select' : 'Pick an event request from the dropdown above'}
                      </p>
                    </div>
                  ) : (
                    <>
                      {messages.map((m, index) => (
                        <div 
                          key={m.id} 
                          className={`flex ${m.senderId === user?.id ? 'justify-end' : 'justify-start'}`}
                        >
                          <div className={`relative max-w-[85%] ${
                            m.senderId === user?.id ? 'ml-2' : 'mr-2'
                          }`}>
                            <div className={`px-3 py-2 text-sm ${
                              m.senderId === user?.id 
                                ? 'bg-accent text-accent-foreground rounded-lg rounded-br-sm' 
                                : 'bg-muted border border-border text-card-foreground rounded-lg rounded-bl-sm'
                            }`}>
                              <div className="break-words">{m.content}</div>
                            </div>
                            <div className={`text-[10px] text-muted-foreground mt-1 px-1 ${
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
                        <div className="flex flex-col items-center justify-center py-8 text-center">
                          <div className="h-12 w-12 bg-accent/10 rounded-full flex items-center justify-center mb-3">
                            <MessageCircle className="h-6 w-6 text-accent" />
                          </div>
                          <h3 className="text-card-foreground font-medium mb-1 text-sm">Start the conversation</h3>
                          <p className="text-muted-foreground text-xs">Send your first message below</p>
                        </div>
                      )}
                    </>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>
            </div>
            
            {/* Input Area - Always visible when not minimized */}
            {!minimized && (
              <div className="shrink-0 p-4 bg-gradient-to-r from-card to-card/80 border-t border-border/50">
                <div className="flex items-end gap-3">
                  <div className="flex-1">
                    <Textarea
                      placeholder={!selectedId ? 'Select an event to start chatting' : (isReady ? 'Type your message...' : 'Connecting...')}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          onSend();
                        }
                      }}
                      className="min-h-[44px] max-h-24 bg-background/50 border-border/50 text-foreground placeholder:text-muted-foreground resize-none rounded-xl text-sm focus:border-accent/50 transition-colors"
                      disabled={!selectedId || !isReady}
                      rows={1}
                    />
                  </div>
                  <Button 
                    onClick={onSend} 
                    disabled={!input.trim() || !selectedId || !isReady}
                    className="bg-accent hover:bg-accent/90 text-accent-foreground px-4 py-3 rounded-xl disabled:opacity-50 shrink-0 h-11 font-medium shadow-minimal hover:shadow-card transition-all duration-200"
                  >
                    Send
                  </Button>
                </div>
                
                {/* Connection Status */}
                <div className="flex items-center justify-center mt-2">
                  <div className={`flex items-center gap-2 text-xs px-2 py-1 rounded-full ${
                    isReady 
                      ? 'text-accent bg-accent/10' 
                      : 'text-muted-foreground bg-muted/50'
                  }`}>
                    <div className={`h-1.5 w-1.5 rounded-full ${
                      isReady ? 'bg-accent animate-pulse' : 'bg-muted-foreground'
                    }`}></div>
                    {isReady ? 'Live chat active' : 'Connecting...'}
                  </div>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
