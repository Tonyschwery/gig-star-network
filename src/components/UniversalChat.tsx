import { useEffect, useMemo, useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, X, Minimize2, Maximize2 } from "lucide-react";
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

  // Request notification permission on first render
  useEffect(() => {
    requestPermission();
  }, [requestPermission]);

  return (
    <>
      {/* Floating chat button */}
      <div className="fixed bottom-4 right-4 z-50">
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
            ? 'h-[400px] w-[320px]' 
            : 'h-[90vh] max-h-[600px] w-[95vw] max-w-[400px]'
        } fixed bottom-4 right-4 bg-card border border-border rounded-lg overflow-hidden`}>
          
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between p-3 bg-card border-b border-border shrink-0">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 bg-accent rounded-full"></div>
                <DialogTitle className="text-base font-medium text-card-foreground">
                  {minimized ? 'Messages' : 'Live Chat'}
                </DialogTitle>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setMinimized(!minimized)}
                  className="h-7 w-7 p-0 text-muted-foreground hover:text-card-foreground"
                  title={minimized ? 'Maximize' : 'Minimize'}
                >
                  {minimized ? <Maximize2 className="h-3 w-3" /> : <Minimize2 className="h-3 w-3" />}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setOpen(false)}
                  className="h-7 w-7 p-0 text-muted-foreground hover:text-card-foreground"
                  title="Close"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>
            
            {/* Event Selector (only in full view) */}
            {!minimized && (
              <div className="p-3 bg-muted/30 border-b border-border shrink-0">
                <Select value={selectedId ?? undefined} onValueChange={(v) => setSelectedId(v)}>
                  <SelectTrigger className="w-full bg-card border-border text-card-foreground text-sm h-9">
                    <SelectValue placeholder="Select an event to chat about" />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    {bookings.map((b) => (
                      <SelectItem 
                        key={b.id} 
                        value={b.id} 
                        className="text-card-foreground text-sm"
                      >
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-1.5 bg-accent rounded-full"></div>
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
              <div className="shrink-0 p-3 bg-card border-t border-border">
                <div className="flex items-end gap-2 mb-2">
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
                      className="min-h-[40px] max-h-20 bg-background border-border text-foreground placeholder:text-muted-foreground resize-none rounded-lg text-sm"
                      disabled={!selectedId || !isReady}
                      rows={1}
                    />
                  </div>
                  <Button 
                    onClick={onSend} 
                    disabled={!input.trim() || !selectedId || !isReady}
                    className="bg-accent hover:bg-accent/90 text-accent-foreground px-3 py-2 rounded-lg disabled:opacity-50 shrink-0 h-10 text-sm"
                  >
                    Send
                  </Button>
                </div>
                
                {/* Connection Status */}
                <div className="flex items-center justify-center">
                  <div className={`flex items-center gap-1 text-xs ${
                    isReady ? 'text-accent' : 'text-muted-foreground'
                  }`}>
                    <div className={`h-1 w-1 rounded-full ${
                      isReady ? 'bg-accent' : 'bg-muted-foreground'
                    }`}></div>
                    {isReady ? 'Connected' : 'Connecting...'}
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
