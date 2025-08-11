import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send } from "lucide-react";

// Interface for a message object, matching the database schema
interface Message {
  id: string;
  content: string;
  sender_id: string; // Corrected to match the 'messages' table schema
  created_at: string;
}

// Props for the ChatModal component
interface ChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  conversationId: string;
}

export const ChatModal = ({ isOpen, onClose, conversationId }: ChatModalProps) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Function to automatically scroll to the latest message
  const scrollToBottom = () => {
    setTimeout(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, 100);
  };

  useEffect(() => {
    if (!conversationId) return;

    // Fetches the initial list of messages for the conversation
    const loadMessages = async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });

      if (!error && data) {
        setMessages(data as Message[]);
        scrollToBottom();
      } else if (error) {
        console.error("Error loading messages:", error);
      }
    };

    loadMessages();

    // Subscribes to real-time updates for new messages in this conversation
    const channel = supabase
      .channel(`messages:conversation:${conversationId}`)
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

    // Unsubscribes from the channel when the component is unmounted
    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId]);

  // Handles sending a new message
  const handleSend = async () => {
    if (!newMessage.trim() || !conversationId || !user) return;

    setIsSending(true);
    
    // **FIXED**: The payload now uses the correct column names ('sender_id')
    // and does not include columns that don't exist.
    const payload = {
      conversation_id: conversationId,
      sender_id: user.id,
      content: newMessage.trim(),
    };

    const { error } = await supabase.from("messages").insert([payload]);
    
    if (error) {
      console.error("Error sending message:", error);
    } else {
      setNewMessage("");
    }
    setIsSending(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg flex flex-col h-[80vh]">
        <DialogHeader>
          <DialogTitle>Chat</DialogTitle>
        </DialogHeader>
        <ScrollArea className="flex-grow p-4 border rounded-md mb-4" ref={scrollRef}>
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`mb-2 p-3 rounded-lg flex flex-col ${
                msg.sender_id === user?.id 
                  ? "bg-primary text-primary-foreground self-end items-end ml-auto" 
                  : "bg-muted self-start items-start"
              } max-w-xs`}
            >
              <span>{msg.content}</span>
              <div className="text-xs opacity-70 mt-1">
                {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
            onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                }
            }}
          />
          <Button onClick={handleSend} disabled={isSending || !newMessage.trim()}>
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
