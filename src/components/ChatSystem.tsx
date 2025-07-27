import { useState } from 'react';
import { ChatInterface } from './ChatInterface';
import { ConversationsList } from './ConversationsList';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageSquare } from 'lucide-react';

interface ChatSystemProps {
  bookingId?: string;
  talentId?: string;
  className?: string;
}

export const ChatSystem = ({ bookingId, talentId, className }: ChatSystemProps) => {
  const [selectedConversationId, setSelectedConversationId] = useState<string>();

  return (
    <div className={`grid grid-cols-1 lg:grid-cols-2 gap-6 ${className}`}>
      {/* Conversations List */}
      <div className="lg:max-w-md">
        <ConversationsList
          onConversationSelect={setSelectedConversationId}
          selectedConversationId={selectedConversationId}
          className="h-[600px]"
        />
      </div>

      {/* Chat Interface */}
      <div className="flex-1">
        {selectedConversationId ? (
          <ChatInterface
            conversationId={selectedConversationId}
            title="Chat"
            className="h-[600px]"
          />
        ) : bookingId && talentId ? (
          <ChatInterface
            bookingId={bookingId}
            talentId={talentId}
            title="Chat"
            className="h-[600px]"
          />
        ) : (
          <Card className="h-[600px] flex items-center justify-center">
            <CardContent className="text-center space-y-4">
              <MessageSquare className="h-16 w-16 mx-auto text-muted-foreground" />
              <div>
                <CardTitle className="text-lg mb-2">Welcome to Chat</CardTitle>
                <p className="text-muted-foreground">
                  Select a conversation from the list to start chatting
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};