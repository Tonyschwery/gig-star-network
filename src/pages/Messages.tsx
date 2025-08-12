import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";

interface ConversationItem {
  id: string;
  otherName: string;
  eventTitle: string;
  eventDate?: string;
  hasUnread: boolean;
}

interface MessageRow {
  id: number;
  conversation_id: string;
  sender_id: string;
  created_at: string;
  is_read: boolean;
  content: string;
}

const Messages = () => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingChat, setLoadingChat] = useState(false);

  // SEO basics
  useEffect(() => {
    document.title = "Messages | Qtalent";
  }, []);

  useEffect(() => {
    if (!user) {
      setConversations([]);
      return;
    }
    const load = async () => {
      setLoadingList(true);
      // Fetch conversations the user participates in with related booking info
      const { data, error } = await supabase
        .from("conversations")
        .select(`
          id,
          created_at,
          booking:bookings!conversations_booking_id_fkey (
            id, user_id, event_type, event_date, booker_name, talent_id,
            talent_profiles:talent_id ( id, artist_name, user_id )
          )
        `)
        .order("updated_at", { ascending: false });

      if (error) {
        console.error("Failed to load conversations", error);
        setLoadingList(false);
        return;
      }

      const base: ConversationItem[] = [];
      for (const c of data || []) {
        const b = (c as any).booking;
        const isBooker = b?.user_id === user.id;
        const otherName = isBooker ? (b?.talent_profiles?.artist_name || "Talent") : (b?.booker_name || "Booker");
        const eventTitle = b?.event_type ? `${b.event_type} event` : "Conversation";
        const eventDate = b?.event_date ? format(new Date(b.event_date), "PPP") : undefined;
        base.push({ id: c.id, otherName, eventTitle, eventDate, hasUnread: false });
      }

      // Compute unread status per conversation
      const results: ConversationItem[] = [];
      for (const item of base) {
        const { data: unread } = await supabase
          .from("messages")
          .select("id")
          .eq("conversation_id", item.id)
          .eq("is_read", false)
          .neq("sender_id", user.id)
          .limit(1);
        results.push({ ...item, hasUnread: !!(unread && unread.length > 0) });
      }

      setConversations(results);
      setLoadingList(false);
      if (results.length && !activeId) setActiveId(results[0].id);
    };
    load();

    // Realtime refresh when new conversations are created/updated
    const convChannel = supabase
      .channel("messages-page-conv")
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
  }, [user, activeId]);

  // Load/subscribe messages for active conversation
  useEffect(() => {
    if (!activeId || !user) return;

    const loadMessages = async () => {
      setLoadingChat(true);
      const { data, error } = await supabase
        .from("messages")
        .select("id, conversation_id, sender_id, created_at, is_read, content")
        .eq("conversation_id", activeId)
        .order("created_at", { ascending: true });
      if (!error) {
        setMessages(data || []);
        // Mark as read
        await supabase.rpc("mark_conversation_messages_read", {
          conversation_id_param: activeId,
          user_id_param: user.id,
        });
        // Clear unread in list
        setConversations((prev) => prev.map((c) => (c.id === activeId ? { ...c, hasUnread: false } : c)));
      }
      setLoadingChat(false);
    };

    loadMessages();

    const channel = supabase
      .channel(`messages-${activeId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${activeId}` },
        async (payload) => {
          const m = payload.new as MessageRow;
          setMessages((prev) => [...prev, m]);
          if (m.sender_id !== user.id) {
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
  }, [activeId, user]);

  const activeConversation = useMemo(() => conversations.find((c) => c.id === activeId), [conversations, activeId]);

  const sendMessage = async () => {
    if (!user || !activeId || !input.trim() || sending) return;
    setSending(true);

    const { error } = await supabase.from("messages").insert({
      conversation_id: activeId,
      sender_id: user.id,
      content: input.trim(),
    });

    if (error) console.error("Failed to send message", error);
    setInput("");
    setSending(false);
  };

  return (
    <main className="container mx-auto px-4 pt-24 pb-6">
      <h1 className="text-2xl font-bold mb-4">Messages</h1>
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4 min-h-[60vh]">
        {/* Conversations list */}
        <Card className="md:col-span-1 overflow-hidden">
          <div className="p-3 border-b">
            <p className="text-sm text-muted-foreground">Your conversations</p>
          </div>
          <ScrollArea className="h-[60vh]">
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
                      <div className="text-xs text-muted-foreground">{c.eventTitle}{c.eventDate ? ` • ${c.eventDate}` : ""}</div>
                    </div>
                    {c.hasUnread && <span className="inline-block w-2 h-2 rounded-full bg-primary" aria-label="unread" />}
                  </button>
                  <Separator />
                </li>
              ))}
            </ul>
          </ScrollArea>
        </Card>

        {/* Chat window */}
        <Card className="md:col-span-2 flex flex-col overflow-hidden">
          <div className="p-3 border-b">
            <p className="font-medium">
              {activeConversation ? `${activeConversation.otherName} • ${activeConversation.eventTitle}` : "Select a conversation"}
            </p>
          </div>
          <ScrollArea className="flex-1 h-[48vh] p-4">
            {loadingChat && <div className="text-sm text-muted-foreground">Loading messages…</div>}
            {!loadingChat && activeConversation && (
              <div className="space-y-2">
                {messages.map((m) => (
                  <div key={m.id} className={`flex ${m.user_id === user?.id ? "justify-end" : "justify-start"}`}>
                    <div className={`px-3 py-2 rounded-lg max-w-[75%] text-sm ${
                      m.user_id === user?.id ? "bg-primary text-primary-foreground" : "bg-muted"
                    }`}>
                      <div>{m.content}</div>
                      <div className="text-[10px] opacity-70 mt-1 text-right">
                        {format(new Date(m.created_at), "p")}
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
            <Button onClick={sendMessage} disabled={!input.trim() || sending || !activeId}>
              Send
            </Button>
          </div>
        </Card>
      </section>
    </main>
  );
};

export default Messages;
