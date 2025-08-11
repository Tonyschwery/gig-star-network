import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send } from "lucide-react";

interface Message {
  id: string;
  content: string;
  user_id: string;
  created_at: string;
}

interface TalentChatModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversationId?: string;
  gigApplicationId?: string;
  talentName?: string;
  eventType?: string;
  eventDate?: string;
}

export const TalentChatModal = ({
  open,
  onOpenChange,
  conversationId,
  gigApplicationId
}: TalentChatModalProps) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const init = async () => {
      let activeConversationId = conversationId;

      // 🔹 Fallback 1: get from gigApplicationId
      if (!activeConversationId && gigApplicationId) {
        const { data: conv, error: convErr } = await supabase
          .from('conversations')
          .select('id')
          .eq('gig_application_id', gigApplicationId)
          .maybeSingle();
        if (!convErr && conv) {
          activeConversationId = conv.id;
        }
      }

      // 🔹 Fallback 2: get from participant IDs
      if (!activeConversationId && user?.id) {
        const { data: conv2, error: convErr2 } = await supabase
          .from('conversations')
          .select('id')
          .or(`talent_id.eq.${user.id},booker_id.eq.${user.id}`)
          .maybeSingle();
        if (!convErr2 && conv2) {
          activeConversationId = conv2.id;
        }
      }

      if (!activeConversationId) return;

      // Load existing messages
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", activeConversationId)
        .order("created_at", { ascending: true });

      if (!error && data) {
        setMessages(data);
        scrollToBottom();
      }

      // Subscribe to realtime messages
      const channel = supabase
        .channel(`room:conversation:${activeConversationId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "messages",
            filter: `conversation_id=eq.${activeConversationId}`,
          },
          (payload) => {
            setMessages((prev) => [...prev, payload.new as Message]);
            scrollToBottom();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    };

    init();
  }, [conversationId, gigApplicationId, user?.id]);

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  };

  const handleSend = async () => {
    if (!newMessage.trim()) return;

    // Resolve conversation ID again before sending
    let targetConversationId = conversationId;
    if (!targetConversationId && gigApplicationId) {
      const { data: conv } = await supabase
        .from('conversations')
        .select('id')
        .eq('gig_application_id', gigApplicationId)
        .maybeSingle();
      targetConversationId = conv?.id;
    }
    if (!targetConversationId && user?.id) {
      const { data: conv2 } = await supabase
        .from('conversations')
        .select('id')
        .or(`talent_id.eq.${user.id},booker_id.eq.${user.id}`)
        .maybeSingle();
      targetConversationId = conv2?.id;
    }

    if (!targetConversationId) return;

    setIsSending(true);
    const { error } = await supabase.from("messages").insert([
      {
        conversation_id: targetConversationId,
        user_id: user?.id as string,
        content: newMessage.trim(),
        sender_type: 'talent',
        created_at: new Date().toISOString(),
      },
    ]);
    setIsSending(false);

    if (!error) {
      setNewMessage("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Talent Chat</DialogTitle>
        </DialogHeader>
        <ScrollArea ref={scrollRef} className="h-96 p-4 border rounded-md mb-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`mb-2 p-2 rounded-md ${
                msg.user_id === user?.id
                  ? "bg-blue-500 text-white ml-auto"
                  : "bg-gray-200"
              } max-w-xs`}
            >
              {msg.content}
              <div className="text-xs opacity-70">
                {new Date(msg.created_at).toLocaleTimeString()}
              </div>
            </div>
          ))}
        </ScrollArea>
        <div className="flex space-x-2">
          <Textarea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type your message..."
            disabled={isSending}
          />
          <Button onClick={handleSend} disabled={isSending || !newMessage.trim()}>
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
