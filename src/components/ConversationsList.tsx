import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { MessageCircle, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

interface ConversationItem {
  id: string;
  booker_id: string;
  talent_id: string;
  booking_id: string;
  last_message_at: string | null;
  created_at: string;
  booking: {
    event_type: string;
    event_date: string;
    booker_name: string;
  } | null;
  talent_profile: {
    artist_name: string;
  } | null;
  last_message: {
    content: string;
    sender_type: string;
  } | null;
}

interface ConversationsListProps {
  onConversationSelect: (conversationId: string) => void;
  selectedConversationId?: string;
  className?: string;
}

export const ConversationsList = ({ 
  onConversationSelect, 
  selectedConversationId,
  className 
}: ConversationsListProps) => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const loadConversations = async () => {
      try {
        // First check if user is a talent
        const { data: talentProfile } = await supabase
          .from('talent_profiles')
          .select('id')
          .eq('user_id', user.id)
          .single();

        let query = supabase
          .from('conversations')
          .select(`
            *,
            booking:bookings(event_type, event_date, booker_name),
            talent_profile:talent_profiles(artist_name)
          `);

        // Filter based on user type
        if (talentProfile) {
          query = query.eq('talent_id', talentProfile.id);
        } else {
          query = query.eq('booker_id', user.id);
        }

        const { data, error } = await query.order('last_message_at', { ascending: false, nullsFirst: false });

        if (error) {
          console.error('Error loading conversations:', error);
          return;
        }

        // Load last message for each conversation
        const conversationsWithMessages = await Promise.all(
          (data || []).map(async (conv: any) => {
            const { data: lastMessage } = await supabase
              .from('messages')
              .select('content, sender_type')
              .eq('conversation_id', conv.id)
              .order('created_at', { ascending: false })
              .limit(1)
              .single();

            return {
              ...conv,
              last_message: lastMessage
            } as ConversationItem;
          })
        );

        setConversations(conversationsWithMessages);
      } catch (error) {
        console.error('Error in loadConversations:', error);
      } finally {
        setLoading(false);
      }
    };

    loadConversations();
  }, [user]);

  const formatLastMessageTime = (timestamp: string | null) => {
    if (!timestamp) return '';
    
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString();
    }
  };

  const getConversationTitle = (conversation: ConversationItem) => {
    if (conversation.talent_profile?.artist_name) {
      return conversation.talent_profile.artist_name;
    }
    if (conversation.booking?.booker_name) {
      return conversation.booking.booker_name;
    }
    return 'Unknown User';
  };

  const getConversationSubtitle = (conversation: ConversationItem) => {
    if (conversation.booking?.event_type) {
      return `${conversation.booking.event_type} - ${new Date(conversation.booking.event_date).toLocaleDateString()}`;
    }
    return 'Booking Discussion';
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Conversations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <div className="text-muted-foreground">Loading conversations...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5" />
          Conversations ({conversations.length})
        </CardTitle>
      </CardHeader>
      
      <CardContent className="p-0">
        <ScrollArea className="h-[400px]">
          {conversations.length === 0 ? (
            <div className="text-center text-muted-foreground py-8 px-4">
              No conversations yet
            </div>
          ) : (
            <div className="space-y-1 p-2">
              {conversations.map((conversation) => (
                <Button
                  key={conversation.id}
                  variant={selectedConversationId === conversation.id ? "secondary" : "ghost"}
                  className={cn(
                    "w-full justify-start text-left h-auto p-3",
                    selectedConversationId === conversation.id && "bg-accent"
                  )}
                  onClick={() => onConversationSelect(conversation.id)}
                >
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <p className="font-medium truncate">
                        {getConversationTitle(conversation)}
                      </p>
                      {conversation.last_message_at && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatLastMessageTime(conversation.last_message_at)}
                        </span>
                      )}
                    </div>
                    
                    <p className="text-xs text-muted-foreground truncate">
                      {getConversationSubtitle(conversation)}
                    </p>
                    
                    {conversation.last_message && (
                      <p className="text-xs text-muted-foreground truncate">
                        <span className="font-medium">
                          {conversation.last_message.sender_type === 'talent' ? 'Talent' : 'Booker'}:
                        </span>{' '}
                        {conversation.last_message.content}
                      </p>
                    )}
                  </div>
                </Button>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};