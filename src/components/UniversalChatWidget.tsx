// PASTE THIS ENTIRE CODE BLOCK INTO src/components/UniversalChatWidget.tsx

import React, { useEffect, useMemo, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { MessageCircle, Send, X } from "lucide-react";

// Define the types for our data
interface Conversation {
  id: string;
  other_user_name: string;
  event_type: string;
  has_unread: boolean;
}

interface Message {
  id: string;
  user_id: string;
  created_at: string;
  content: string;
}

export const UniversalChatWidget: React.FC = () => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Function to fetch all conversations for the current user
  const fetchConversations = async () => {
    if (!user) return;
    setIsLoading(true);
    const { data, error } = await supabase.rpc('get_user_conversations');
    if (error) {
      console.error("Error fetching conversations:", error);
    } else {
      setConversations(data || []);
      // If no conversation is active, select the first one by default
      if (!activeConversationId && data && data.length > 0) {
        setActiveConversationId(data[0].id);
      }
    }
    setIsLoading(false);
  };

  // Fetch conversations when the widget is opened
  useEffect(() => {
    if (isOpen) {
      fetchConversations();
    }
  }, [isOpen]);
  
  // Fetch messages when a conversation is selected
  useEffect(() => {
    const fetchMessages = async () => {
      if (!activeConversationId) return;
      setIsLoading(true);
      const { data, error } = await supabase.from('messages').select('*').eq('conversation_id', activeConversationId).order('created_at');
      if (error) console.error("Error fetching messages:", error);
      else setMessages(data || []);
      setIsLoading(false);
    };
    fetchMessages();
  }, [activeConversationId]);

  // Real-time subscription for new messages
  useEffect(() => {
    if (!activeConversationId) return;
    const channel = supabase.channel(`messages:${activeConversationId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${activeConversationId}` },
        (payload) => setMessages(prev => [...prev, payload.new as Message])
      ).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [activeConversationId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !activeConversationId || !user) return;
    const content = newMessage.trim();
    setNewMessage("");
    await supabase.from('messages').insert({ conversation_id: activeConversationId, user_id: user.id, content });
  };

  if (!user) return null;

  return (
    <>
      <div className="fixed bottom-4 right-4 z-50">
        <Button size="icon" className="rounded-full h-14 w-14 shadow-lg" onClick={() => setIsOpen(true)}><MessageCircle /></Button>
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="p-0 w-[95vw] md:w-[860px] h-[80vh] flex flex-col">
          <DialogHeader className="p-4 border-b flex flex-row items-center justify-between">
            <DialogTitle>Messages</DialogTitle>
            <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)}><X className="h-5 w-5" /></Button>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-0 flex-1 min-h-0">
            <Card className="md:col-span-1 rounded-none border-0 border-r">
              <ScrollArea className="h-full">
                {isLoading && <p className="p-4 text-sm text-muted-foreground">Loading...</p>}
                {!isLoading && conversations.map((convo) => (
                  <div key={convo.id}>
                    <button onClick={() => setActiveConversationId(convo.id)} className={`w-full text-left p-3 hover:bg-muted ${activeConversationId === convo.id ? 'bg-muted' : ''}`}>
                      <div className="font-semibold">{convo.other_user_name}</div>
                      <div className="text-xs text-muted-foreground truncate">{convo.event_type}</div>
                    </button>
                    <Separator />
                  </div>
                ))}
              </ScrollArea>
            </Card>
            <div className="md:col-span-2 flex flex-col">
                {activeConversationId ? (
                    <>
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
                        <div className="p-3 border-t flex items-center gap-2">
                            <Textarea placeholder="Type your message…" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); }}} />
                            <Button onClick={handleSendMessage} disabled={!newMessage.trim()}><Send className="h-4 w-4" /></Button>
                        </div>
                    </>
                ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                        <p>Select a conversation to start chatting.</p>
                    </div>
                )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};