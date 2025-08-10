// PASTE THIS ENTIRE CODE BLOCK, REPLACING THE OLD FILE

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

interface ChatModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversationId: string;
}

export const ChatModal = ({ open, onOpenChange, conversationId }: ChatModalProps) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!conversationId) return;

    // Load existing messages
    const loadMessages = async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });

      if (!error && data) {
        setMessages(data);
        scrollToBottom();
      }
    };

    loadMessages();

    // Subscribe to realtime messages for this conversation
    const channel = supabase
      .channel(`room:conversation:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
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
  }, [conversationId]);

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  };

  const handleSend = async () => {
    if (!newMessage.trim() || !conversationId) return;

    setIsSending(true);
    const { error } = await supabase.from("messages").insert([
      {
        conversation_id: conversationId,
        user_id: user?.id,
        content: newMessage.trim(),
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
          <DialogTitle>Chat</DialogTitle>
        </DialogHeader>
        <ScrollArea ref={scrollRef} className="h-96 p-4 border rounded-md mb-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`mb-2 p-2 rounded-md ${
                msg.user_id === user?.id ? "bg-blue-500 text-white ml-auto" : "bg-gray-200"
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
