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
  const [senderType, setSenderType] = useState<'booker' | 'talent' | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Determine sender type based on booking ownership
  useEffect(() => {
    const fetchSenderType = async () => {
      if (!conversationId || !user?.id) return;
      const { data } = await supabase
        .from('conversations')
        .select(`id, booking:bookings!conversations_booking_id_fkey ( user_id )`)
        .eq('id', conversationId)
        .maybeSingle();

      const isBooker = (data as any)?.booking?.user_id === user.id;
      setSenderType(isBooker ? 'booker' : 'talent');
    };
    if (open) fetchSenderType();
  }, [conversationId, open, user?.id]);

  const markAllMessagesAsRead = async () => {
    if (!conversationId || !user?.id) return;
    await supabase.rpc('mark_conversation_messages_read', {
      conversation_id_param: conversationId,
      user_id_param: user.id,
    });
  };

  useEffect(() => {
    const fetchMessages = async () => {
      if (!conversationId) return;
      setMessages([]); // Clear previous messages
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) console.error("Error fetching messages:", error);
      else setMessages(data || []);
      await markAllMessagesAsRead();
    };

    if (open) {
      fetchMessages();
    }
  }, [conversationId, open]);

  // Real-time new message subscription
  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase.channel(`chat:${conversationId}`)
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
        async (payload) => {
          const newMsg = payload.new as Message;
          setMessages(prevMessages => 
            prevMessages.some(msg => msg.id === newMsg.id) 
            ? prevMessages 
            : [...prevMessages, newMsg]
          );
          if (newMsg.user_id !== user?.id) {
            await markAllMessagesAsRead();
          }
        }
      ).subscribe();
    
    return () => { supabase.removeChannel(channel); };
  }, [conversationId, user?.id]);
  
  useEffect(scrollToBottom, [messages]);

  const sendMessage = async () => {
    if (!newMessage.trim() || !conversationId || !user) return;
    setIsSending(true);

    const content = newMessage.trim();
    setNewMessage(""); // Clear input immediately for better UX

    const { error } = await supabase.from('messages').insert({
        conversation_id: conversationId,
        content: content,
        user_id: user.id,
        sender_type: senderType ?? 'booker',
    });

    if (error) {
      console.error("Error sending message:", error);
      setNewMessage(content); // Restore message on error
    }
    setIsSending(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="h-[70vh] flex flex-col p-0" aria-describedby="chat-desc">
        <DialogHeader className="p-4 border-b">
          <DialogTitle>Chat</DialogTitle>
          <p id="chat-desc" className="sr-only">Conversation between booker and talent</p>
        </DialogHeader>
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            {messages.map((message) => (
              <div key={message.id} className={`flex ${message.user_id === user?.id ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-lg px-3 py-2 ${message.user_id === user?.id ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>
        <div className="p-4 border-t">
          <div className="flex space-x-2">
            <Textarea value={newMessage} onChange={(e) => setNewMessage(e.target.value)} onKeyDown={(e) => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }}} placeholder="Type your message..." disabled={isSending} />
            <Button onClick={sendMessage} disabled={!newMessage.trim() || isSending} size="icon"><Send className="h-4 w-4" /></Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
