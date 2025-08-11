import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send } from "lucide-react";

// Corrected Message interface to match the database schema
interface Message {
  id: string;
  content: string;
  sender_id: string; // Corrected from user_id to sender_id
  created_at: string;
}

interface ChatModalProps {
  isOpen: boolean; // Changed from 'open' to 'isOpen' for clarity
  onClose: () => void; // Changed to a simpler onClose function
  conversationId: string;
}

export const ChatModal = ({ isOpen, onClose, conversationId }: ChatModalProps) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Function to scroll to the bottom of the chat window
  const scrollToBottom = () => {
    setTimeout(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, 100);
  };

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
        setMessages(data as Message[]);
        scrollToBottom();
      } else if (error) {
        console.error("Error loading messages:", error);
      }
    };

    loadMessages();

    // Subscribe to realtime messages for this conversation
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

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId]);

  const handleSend = async () => {
    if (!newMessage.trim() || !conversationId || !user) return;

    setIsSending(true);
    
    // Corrected the insert payload to match the database schema
    const payload = {
      conversation_id: conversationId,
      sender_id: user.id, // Corrected to sender_id
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
