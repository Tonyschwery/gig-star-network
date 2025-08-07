// PASTE THIS ENTIRE CODE BLOCK, REPLACING THE OLD FILE

import { useState, useEffect, useRef } from "react";
import { Send, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

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

export function ChatModal({ open, onOpenChange, conversationId }: ChatModalProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    const fetchMessages = async () => {
      if (!conversationId) return;
      const { data } = await supabase.from('messages').select('*').eq('conversation_id', conversationId).order('created_at');
      setMessages(data || []);
    };
    fetchMessages();

    const channel = supabase.channel(`chat:${conversationId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          setMessages(prev => [...prev, payload.new as Message]);
        }
      ).subscribe();
    
    return () => { supabase.removeChannel(channel); };
  }, [conversationId]);
  
  useEffect(scrollToBottom, [messages]);

  const sendMessage = async () => {
    if (!newMessage.trim() || !conversationId || !user) return;
    setIsSending(true);
    await supabase.from('messages').insert({
        conversation_id: conversationId,
        content: newMessage.trim(),
        user_id: user.id,
        // sender_type will be handled by RLS or triggers if needed
    });
    setNewMessage("");
    setIsSending(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="h-[600px] flex flex-col p-0">
        <DialogHeader className="p-4 border-b">
          <DialogTitle>Chat</DialogTitle>
        </DialogHeader>
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            {messages.map((message) => (
              <div key={message.id} className={`flex ${message.user_id === user?.id ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-lg px-3 py-2 ${message.user_id === user?.id ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                  <p className="text-sm">{message.content}</p>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>
        <div className="p-4 border-t">
          <div className="flex space-x-2">
            <Textarea value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="Type your message..." disabled={isSending} />
            <Button onClick={sendMessage} disabled={!newMessage.trim() || isSending} size="icon"><Send className="h-4 w-4" /></Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}