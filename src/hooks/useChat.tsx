import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/use-toast';

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender_type: string;
  content: string;
  is_filtered: boolean;
  original_content: string;
  created_at: string;
  updated_at: string;
}

interface Conversation {
  id: string;
  booker_id: string;
  talent_id: string;
  booking_id: string;
  created_at: string;
  updated_at: string;
  last_message_at: string | null;
}

interface UseChatProps {
  conversationId?: string;
  bookingId?: string;
  talentId?: string;
}

export const useChat = ({ conversationId, bookingId, talentId }: UseChatProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  // Get or create conversation
  const getOrCreateConversation = useCallback(async () => {
    if (!user || !bookingId || !talentId) return null;

    try {
      // First try to find existing conversation
      const { data: existingConversation, error: fetchError } = await supabase
        .from('conversations')
        .select('*')
        .eq('booking_id', bookingId)
        .eq('talent_id', talentId)
        .eq('booker_id', user.id)
        .single();

      if (existingConversation && !fetchError) {
        return existingConversation;
      }

      // Create new conversation if not found
      const { data: newConversation, error: createError } = await supabase
        .from('conversations')
        .insert({
          booker_id: user.id,
          talent_id: talentId,
          booking_id: bookingId
        })
        .select()
        .single();

      if (createError) {
        console.error('Error creating conversation:', createError);
        toast({
          title: "Error",
          description: "Failed to create conversation",
          variant: "destructive"
        });
        return null;
      }

      return newConversation;
    } catch (error) {
      console.error('Error in getOrCreateConversation:', error);
      return null;
    }
  }, [user, bookingId, talentId, toast]);

  // Load messages for conversation
  const loadMessages = useCallback(async (convId: string) => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', convId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error loading messages:', error);
        toast({
          title: "Error",
          description: "Failed to load messages",
          variant: "destructive"
        });
        return;
      }

      setMessages(data || []);
    } catch (error) {
      console.error('Error in loadMessages:', error);
    }
  }, [toast]);

  // Initialize chat
  useEffect(() => {
    const initializeChat = async () => {
      setLoading(true);
      
      if (conversationId) {
        // Load existing conversation
        const { data: conv, error } = await supabase
          .from('conversations')
          .select('*')
          .eq('id', conversationId)
          .single();

        if (conv && !error) {
          setConversation(conv);
          await loadMessages(conversationId);
        }
      } else if (bookingId && talentId) {
        // Get or create conversation for booking
        const conv = await getOrCreateConversation();
        if (conv) {
          setConversation(conv);
          await loadMessages(conv.id);
        }
      }
      
      setLoading(false);
    };

    if (user) {
      initializeChat();
    }
  }, [user, conversationId, bookingId, talentId, getOrCreateConversation, loadMessages]);

  // Set up realtime subscription
  useEffect(() => {
    if (!conversation?.id) return;

    const channel = supabase
      .channel(`messages:${conversation.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversation.id}`
        },
        (payload) => {
          const newMessage = payload.new as Message;
          setMessages(prev => [...prev, newMessage]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversation?.id]);

  // Send message
  const sendMessage = useCallback(async (content: string) => {
    if (!user || !conversation || !content.trim()) return;

    setSending(true);
    
    try {
      // Determine sender type based on user role
      const { data: talentProfile } = await supabase
        .from('talent_profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      const senderType = talentProfile ? 'talent' : 'booker';

      const { error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversation.id,
          sender_id: user.id,
          sender_type: senderType,
          content: content.trim()
        });

      if (error) {
        console.error('Error sending message:', error);
        toast({
          title: "Error",
          description: "Failed to send message",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error in sendMessage:', error);
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive"
      });
    } finally {
      setSending(false);
    }
  }, [user, conversation, toast]);

  return {
    messages,
    conversation,
    loading,
    sending,
    sendMessage
  };
};