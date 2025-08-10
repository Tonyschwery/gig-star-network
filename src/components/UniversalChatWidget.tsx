import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { MessageCircle, Send, X } from "lucide-react";

interface ConversationItem {
  id: string;
  otherName: string;
  eventTitle: string;
  eventDate?: string;
  hasUnread: boolean;
}

interface MessageRow {
  id: string;
  conversation_id: string;
  user_id: string;
  created_at: string;
  is_read: boolean;
  content: string;
  sender_type: string;
}

export const UniversalChatWidget: React.FC = () => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingList, setLoadingList] = useState(false);
  const [loadingChat, setLoadingChat] = useState(false);

  // Load conversations for the logged-in user
  useEffect(() => {
    if (!open || !user) return;

    const load = async () => {
      setLoadingList(true);

      // 1) Fetch conversations basic fields first (avoid broken FK alias)
      const { data: convs, error: convErr } = await supabase
        .from("conversations")
        .select("id, created_at, booking_id")
        .order("created_at", { ascending: false });

      if (convErr) {
        console.error("Failed to load conversations", convErr);
        setLoadingList(false);
        return;
      }

      if (!convs || convs.length === 0) {
        setConversations([]);
        setLoadingList(false);
        setActiveId(null);
        return;
      }

      // 2) Fetch related bookings in a single query
      const bookingIds = convs.map(c => c.booking_id).filter(Boolean);
      const { data: bookingsData, error: bookingsErr } = await supabase
        .from("bookings")
        .select(`
          id, user_id, event_type, event_date, booker_name, talent_id,
          talent_profiles:talent_id ( id, artist_name, user_id )
        `)
        .in("id", bookingIds as string[]);

      if (bookingsErr) {
        console.error("Failed to load bookings for conversations", bookingsErr);
        setLoadingList(false);
        return;
      }

      const bookingMap = new Map<string, any>();
      (bookingsData || []).forEach(b => bookingMap.set(b.id, b));

      // 3) Build conversation list items filtered to current user
      const results: ConversationItem[] = [];
      for (const c of convs) {
        const b = bookingMap.get(c.booking_id);
        if (!b) continue;

        const isBooker = b.user_id === user.id;
        const isTalent = b?.talent_profiles?.user_id === user.id;
        if (!isBooker && !isTalent) continue; // only show user's conversations

        const otherName = isBooker ? (b?.talent_profiles?.artist_name || "Talent") : (b?.booker_name || "Booker");
        const eventTitle = b?.event_type ? `${b.event_type} event` : "Conversation";
        const eventDate = b?.event_date ? new Date(b.event_date).toLocaleDateString() : undefined;

        results.push({ id: c.id, otherName, eventTitle, eventDate, hasUnread: false });
      }

      // 4) Compute unread per conversation (keep simple for now)
      const withUnread: ConversationItem[] = [];
      for (const item of results) {
        const { data: unread } = await supabase
          .from("messages")
          .select("id")
          .eq("conversation_id", item.id)
          .eq("is_read", false)
          .neq("user_id", user.id)
          .limit(1);
        withUnread.push({ ...item, hasUnread: !!(unread && unread.length > 0) });
      }

      setConversations(withUnread);
      setLoadingList(false);
      if (withUnread.length && !activeId) setActiveId(withUnread[0].id);
    };

    load();

    // Realtime updates for conversations
    const convChannel = supabase
      .channel("chat-widget-conv")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "conversations" },
        () => load()
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "conversations" },
        () => load()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(convChannel);
    };
  }, [open, user, activeId]);

  // Load messages for active conversation and subscribe
  useEffect(() => {
    if (!open || !activeId || !user) return;

    const loadMessages = async () => {
      setLoadingChat(true);
      const { data, error } = await supabase
        .from("messages")
        .select("id, conversation_id, user_id, created_at, is_read, content, sender_type")
        .eq("conversation_id", activeId)
        .order("created_at", { ascending: true });
      if (!error) {
        setMessages(data || []);
        // mark as read
        await supabase.rpc("mark_conversation_messages_read", {
          conversation_id_param: activeId,
          user_id_param: user.id,
        });
        setConversations((prev) => prev.map((c) => (c.id === activeId ? { ...c, hasUnread: false } : c)));
      }
      setLoadingChat(false);
    };

    loadMessages();

    const channel = supabase
      .channel(`chat-widget:${activeId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${activeId}` },
        async (payload) => {
          const m = payload.new as MessageRow;
          setMessages((prev) => [...prev, m]);
          if (m.user_id !== user.id) {
            await supabase.rpc("mark_conversation_messages_read", {
              conversation_id_param: activeId,
              user_id_param: user.id,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [open, activeId, user]);

  const activeConversation = useMemo(
    () => conversations.find((c) => c.id === activeId),
    [conversations, activeId]
  );

  const sendMessage = async () => {
    if (!user || !activeId || !input.trim() || sending) return;
    setSending(true);

    // Resolve sender type without relying on FK aliasing
    const { data: conv } = await supabase
      .from("conversations")
      .select("id, booking_id")
      .eq("id", activeId)
      .maybeSingle();

    let sender_type: "talent" | "booker" = "talent";
    if (conv?.booking_id) {
      const { data: booking } = await supabase
        .from("bookings")
        .select("id, user_id")
        .eq("id", conv.booking_id)
        .maybeSingle();
      if (booking?.user_id === user.id) sender_type = "booker";
    }

    const { error } = await supabase.from("messages").insert({
      conversation_id: activeId,
      user_id: user.id,
      content: input.trim(),
      sender_type,
    });

    if (error) console.error("Failed to send message", error);
    setInput("");
    setSending(false);
  };

  if (!user) return null;

  return (
    <>
      {/* Floating button */}
      <div className="fixed bottom-4 right-4 z-50">
        <Button size="icon" className="rounded-full shadow-md" onClick={() => setOpen(true)} aria-label="Open messages">
          <MessageCircle className="h-5 w-5" />
        </Button>
      </div>

      {/* Chat dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="p-0 w-[95vw] md:w-[860px] h-[80vh] flex flex-col">
          <DialogHeader className="p-4 border-b flex flex-row items-center justify-between">
            <DialogTitle>Messages</DialogTitle>
            <Button variant="ghost" size="icon" onClick={() => setOpen(false)} aria-label="Close messages">
              <X className="h-5 w-5" />
            </Button>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-0 flex-1">
            {/* Conversations list */}
            <Card className="md:col-span-1 rounded-none border-0 border-r">
              <div className="p-3 border-b">
                <p className="text-sm text-muted-foreground">Your conversations</p>
              </div>
              <ScrollArea className="h-[calc(80vh-140px)]">
                {loadingList && (
                  <div className="p-4 text-sm text-muted-foreground">Loading conversations…</div>
                )}
                {!loadingList && conversations.length === 0 && (
                  <div className="p-4 text-sm text-muted-foreground">No conversations yet.</div>
                )}
                <ul>
                  {conversations.map((c) => (
                    <li key={c.id}>
                      <button
                        className={`w-full text-left p-3 hover:bg-muted transition flex items-center justify-between ${
                          c.id === activeId ? "bg-muted" : ""
                        }`}
                        onClick={() => setActiveId(c.id)}
                      >
                        <div>
                          <div className="font-medium">{c.otherName}</div>
                          <div className="text-xs text-muted-foreground">
                            {c.eventTitle}
                            {c.eventDate ? ` • ${c.eventDate}` : ""}
                          </div>
                        </div>
                        {c.hasUnread && (
                          <span className="inline-block w-2 h-2 rounded-full bg-primary" aria-label="unread" />
                        )}
                      </button>
                      <Separator />
                    </li>
                  ))}
                </ul>
              </ScrollArea>
            </Card>

            {/* Chat window */}
            <Card className="md:col-span-2 rounded-none border-0">
              <div className="p-3 border-b">
                <p className="font-medium">
                  {activeConversation
                    ? `${activeConversation.otherName} • ${activeConversation.eventTitle}`
                    : "Select a conversation"}
                </p>
              </div>

              <ScrollArea className="h-[calc(80vh-200px)] p-4">
                {loadingChat && (
                  <div className="text-sm text-muted-foreground">Loading messages…</div>
                )}
                {!loadingChat && activeConversation && (
                  <div className="space-y-2">
                    {messages.map((m) => (
                      <div key={m.id} className={`flex ${m.user_id === user?.id ? "justify-end" : "justify-start"}`}>
                        <div
                          className={`px-3 py-2 rounded-lg max-w-[75%] text-sm ${
                            m.user_id === user?.id
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted"
                          }`}
                        >
                          <div>{m.content}</div>
                          <div className="text-[10px] opacity-70 mt-1 text-right">
                            {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {!loadingChat && !activeConversation && (
                  <div className="text-sm text-muted-foreground">Pick a conversation to start chatting.</div>
                )}
              </ScrollArea>

              <div className="p-3 border-t flex items-center gap-2">
                <Textarea
                  placeholder="Type your message…"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                  className="min-h-[44px] max-h-40"
                />
                <Button onClick={sendMessage} disabled={!input.trim() || sending || !activeId} aria-label="Send message">
                  <Send className="h-4 w-4 mr-2" />
                  Send
                </Button>
              </div>
            </Card>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
