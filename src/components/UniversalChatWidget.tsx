import React, { useEffect, useMemo, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";

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
  const scrollRef = useRef<HTMLDivElement>(null);

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
          setConversations((prev) => [payload.new as Conversation, ...prev]);
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
    if (!error) setNewMessage("");
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
                      <div className="font-medium">Conversation</div>
                      {unreadMap[c.id] && <Badge variant="destructive">New</Badge>}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {c.booking_id ? 'Direct booking' : 'Gig opportunity'}
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
