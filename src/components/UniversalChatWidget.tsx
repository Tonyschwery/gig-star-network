import React, { useEffect, useMemo, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
interface Conversation {
  id: string;
  booking_id: string | null;
  gig_application_id: string | null;
  created_at: string;
  updated_at: string;
}

interface Message {
  id: string;
  content: string;
  user_id: string;
  created_at: string;
  is_read?: boolean;
}

interface UniversalChatWidgetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const UniversalChatWidget: React.FC<UniversalChatWidgetProps> = ({ open, onOpenChange }) => {
  const { user } = useAuth();
  const [isTalent, setIsTalent] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [unreadMap, setUnreadMap] = useState<Record<string, boolean>>({});
  const [convMeta, setConvMeta] = useState<Record<string, { title: string; subtitle: string }>>({});
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  // Play a short beep when a new message arrives from others
  const playDing = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine';
      o.frequency.value = 880; // A5
      o.connect(g);
      g.connect(ctx.destination);
      g.gain.setValueAtTime(0.0001, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.05, ctx.currentTime + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.25);
      o.start();
      o.stop(ctx.currentTime + 0.26);
    } catch {}
  };

  // Build human-friendly titles/subtitles for conversations
  const buildConversationMeta = async (convs: Conversation[]) => {
    try {
      if (!convs || convs.length === 0) return;

      const meta: Record<string, { title: string; subtitle: string }> = {};

      // Booking-based conversations
      const bookingIds = Array.from(new Set(convs.filter(c => c.booking_id).map(c => c.booking_id!)));
      let bookingMap = new Map<string, any>();
      let talentMap = new Map<string, any>();
      if (bookingIds.length) {
        const { data: bookings } = await supabase
          .from('bookings')
          .select('id,event_type,event_date,booker_name,talent_id')
          .in('id', bookingIds);
        bookingMap = new Map((bookings || []).map((b: any) => [b.id, b]));

        const talentIds = Array.from(new Set((bookings || []).map((b: any) => b.talent_id).filter(Boolean)));
        if (talentIds.length) {
          const { data: talents } = await supabase
            .from('talent_profiles')
            .select('id,artist_name,user_id')
            .in('id', talentIds);
          talentMap = new Map((talents || []).map((t: any) => [t.id, t]));
        }
      }

      // Gig-application conversations
      const gigAppIds = Array.from(new Set(convs.filter(c => c.gig_application_id).map(c => c.gig_application_id!)));
      let gaMap = new Map<string, any>();
      let gaTalentMap = new Map<string, any>();
      let gaGigBookingMap = new Map<string, any>();
      if (gigAppIds.length) {
        const { data: gas } = await supabase
          .from('gig_applications')
          .select('id,gig_id,talent_id')
          .in('id', gigAppIds);
        gaMap = new Map((gas || []).map((ga: any) => [ga.id, ga]));

        const gigIds = Array.from(new Set((gas || []).map((ga: any) => ga.gig_id)));
        if (gigIds.length) {
          const { data: gigs } = await supabase
            .from('bookings')
            .select('id,event_type,event_date,booker_name')
            .in('id', gigIds);
          gaGigBookingMap = new Map((gigs || []).map((g: any) => [g.id, g]));
        }

        const gaTalentIds = Array.from(new Set((gas || []).map((ga: any) => ga.talent_id)));
        if (gaTalentIds.length) {
          const { data: talents2 } = await supabase
            .from('talent_profiles')
            .select('id,artist_name,user_id')
            .in('id', gaTalentIds);
          gaTalentMap = new Map((talents2 || []).map((t: any) => [t.id, t]));
        }
      }

      convs.forEach((c) => {
        if (c.booking_id) {
          const b = bookingMap.get(c.booking_id);
          if (b) {
            const title = isTalent ? (b.booker_name || 'Booker') : (talentMap.get(b.talent_id)?.artist_name || 'Talent');
            const subtitle = `${b.event_type} • ${new Date(b.event_date).toLocaleDateString()}`;
            meta[c.id] = { title, subtitle };
          }
        } else if (c.gig_application_id) {
          const ga = gaMap.get(c.gig_application_id);
          if (ga) {
            const gig = gaGigBookingMap.get(ga.gig_id);
            const title = isTalent ? (gig?.booker_name || 'Booker') : (gaTalentMap.get(ga.talent_id)?.artist_name || 'Talent');
            const subtitle = gig ? `${gig.event_type} • ${new Date(gig.event_date).toLocaleDateString()}` : 'Gig conversation';
            meta[c.id] = { title, subtitle };
          }
        }
      });

      setConvMeta((prev) => ({ ...prev, ...meta }));
    } catch (e) {
      console.error('Failed to build conversation metadata', e);
    }
  };

  useEffect(() => {
    const init = async () => {
      if (!user?.id) return;
      // Detect if current user has a talent profile
      const { data: tp } = await supabase
        .from('talent_profiles')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();
      setIsTalent(!!tp);

      // Load conversations visible to this user (RLS handles scope)
      const { data: convs } = await supabase
        .from('conversations')
        .select('*')
        .order('updated_at', { ascending: false });
      setConversations(convs || []);
      setLoading(false);
      await buildConversationMeta(convs || []);

      // Precompute unread status per conversation (latest message not by me and unread)
      const unread: Record<string, boolean> = {};
      if (convs && convs.length) {
        await Promise.all(convs.map(async (c) => {
          const { data: last } = await supabase
            .from('messages')
            .select('id,user_id,is_read,created_at')
            .eq('conversation_id', c.id)
            .order('created_at', { ascending: false })
            .limit(1);
          if (last && last.length) {
            unread[c.id] = last[0].user_id !== user.id && last[0].is_read === false;
          } else unread[c.id] = false;
        }));
      }
      setUnreadMap(unread);

      // Realtime: new conversations
      const convChannel = supabase
        .channel('chat-conversations')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'conversations' }, (payload) => {
          const conv = payload.new as Conversation;
          setConversations((prev) => [conv, ...prev]);
          buildConversationMeta([conv]);
        })
        .subscribe();

      return () => {
        supabase.removeChannel(convChannel);
      };
    };

    init();
  }, [user?.id]);

  useEffect(() => {
    const loadMessages = async () => {
      if (!selectedId) return;
      const { data } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', selectedId)
        .order('created_at', { ascending: true });
      setMessages(data || []);
      scrollToBottom();

      // Mark as read for this conversation
      if (user?.id) {
        await supabase.rpc('mark_conversation_messages_read', {
          conversation_id_param: selectedId,
          user_id_param: user.id,
        });
        setUnreadMap((prev) => ({ ...prev, [selectedId]: false }));
      }

      // Subscribe to new messages
      const msgChannel = supabase
        .channel(`chat-messages-${selectedId}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${selectedId}` }, (payload) => {
          const m = payload.new as Message;
          setMessages((prev) => [...prev, m]);
          if (m.user_id !== user?.id) {
            playDing();
          }
          scrollToBottom();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(msgChannel);
      };
    };

    loadMessages();
  }, [selectedId, user?.id]);

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  };

  const handleSend = async () => {
    if (!newMessage.trim() || !selectedId || !user?.id) return;
    const sender_type = isTalent ? 'talent' : 'booker';
    const { error } = await supabase.from('messages').insert([
      {
        conversation_id: selectedId,
        user_id: user.id,
        content: newMessage.trim(),
        sender_type,
        created_at: new Date().toISOString(),
      },
    ]);
    if (error) {
      console.error("Error sending message:", error);
      toast({ title: "Message not sent", description: "Please try again.", variant: "destructive" as any });
      return;
    }
    setNewMessage("");
    scrollToBottom();
  };

  const list = useMemo(() => conversations, [conversations]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Messages</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Left: Conversations */}
          <div className="border rounded-md overflow-hidden">
            <ScrollArea className="h-80">
              {loading && <div className="p-4 text-muted-foreground">Loading...</div>}
              {!loading && list.length === 0 && (
                <div className="p-4 text-muted-foreground">No conversations yet</div>
              )}
              <div className="divide-y">
                {list.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setSelectedId(c.id)}
                    className={`w-full text-left p-3 hover:bg-accent transition ${selectedId === c.id ? 'bg-accent' : ''}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-medium">{convMeta[c.id]?.title || (c.booking_id ? 'Direct booking' : 'Gig conversation')}</div>
                      {unreadMap[c.id] && <Badge variant="destructive">New</Badge>}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {convMeta[c.id]?.subtitle || 'Tap to view details'}
                    </div>
                  </button>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Right: Messages */}
          <div className="md:col-span-2 border rounded-md p-3 flex flex-col">
            <ScrollArea ref={scrollRef} className="flex-1 pr-2">
              {(!selectedId || messages.length === 0) && (
                <div className="p-4 text-muted-foreground">Select a conversation</div>
              )}
              <div className="space-y-2">
                {messages.map((m) => (
                  <div
                    key={m.id}
                    className={`max-w-[70%] rounded-md px-3 py-2 text-sm ${m.user_id === user?.id ? 'ml-auto bg-primary text-primary-foreground' : 'bg-muted'}`}
                  >
                    <div>{m.content}</div>
                    <div className="text-[10px] opacity-70 mt-1">{new Date(m.created_at).toLocaleTimeString()}</div>
                  </div>
                ))}
              </div>
            </ScrollArea>
            <div className="mt-3 flex gap-2">
              <Textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type your message..."
                className="min-h-[44px]"
              />
              <Button onClick={handleSend} disabled={!newMessage.trim()}>Send</Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default UniversalChatWidget;
