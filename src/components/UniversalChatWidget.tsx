import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState, useMemo } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { ChatModal } from "./ChatModal";
import { useUserMode } from "@/contexts/UserModeContext";
import { Card, CardHeader, CardTitle, CardContent } from "./ui/card";
import { Skeleton } from "./ui/skeleton";

// Define the props interface
interface UniversalChatWidgetProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  isTabContent?: boolean;
}

const UniversalChatWidget = ({ open, onOpenChange, isTabContent = false }: UniversalChatWidgetProps) => {
    const { user } = useAuth();
    const { userMode } = useUserMode();
    const [conversations, setConversations] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isChatModalOpen, setChatModalOpen] = useState(false);
    const [selectedConversation, setSelectedConversation] = useState<any | null>(null);

    const userId = user?.id;
    const memoizedUserId = useMemo(() => userId, [userId]);

    useEffect(() => {
        const fetchConversations = async () => {
            if (!memoizedUserId) return;

            setLoading(true);
            const { data: talentProfile } = await supabase
                .from('talent_profiles')
                .select('id')
                .eq('user_id', memoizedUserId)
                .single();

            const isTalent = !!talentProfile;
            const columnToFilter = isTalent ? 'talent_id' : 'user_id';
            const idToFilter = isTalent ? talentProfile.id : memoizedUserId;

            const { data, error } = await supabase
                .from('conversations')
                .select(`
                    *,
                    booking:bookings!inner(*, 
                        talent:talent_profiles!inner(*, talent_user:profiles!user_id(*)),
                        booker:profiles!bookings_user_id_fkey(*)
                    )
                `)
                .eq(`booking.${columnToFilter}`, idToFilter)
                .order('last_message_at', { ascending: false });

            if (error) {
                console.error('Error fetching conversations:', error);
            } else {
                setConversations(data || []);
            }
            setLoading(false);
        };

        fetchConversations();
    }, [memoizedUserId]);

    const handleConversationClick = (convo: any) => {
        setSelectedConversation(convo);
        setChatModalOpen(true);
    };

    const ChatContent = (
      <Card>
        <CardHeader>
            <CardTitle>Your Conversations</CardTitle>
        </CardHeader>
        <CardContent>
            {loading && (
              <div className="space-y-4">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            )}
            {!loading && conversations.length === 0 && <p className="text-muted-foreground text-center py-4">No conversations yet.</p>}
            <div className="space-y-2">
                {conversations.map((convo) => {
                    const otherParty = userMode === 'talent' ? convo.booking.booker : convo.booking.talent.talent_user;
                    return (
                        <div key={convo.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted cursor-pointer" onClick={() => handleConversationClick(convo)}>
                            <div className="flex items-center">
                                <Avatar>
                                    <AvatarImage src={otherParty?.avatar_url} />
                                    <AvatarFallback>{otherParty?.full_name?.[0].toUpperCase()}</AvatarFallback>
                                </Avatar>
                                <div className="ml-4">
                                    <p className="font-semibold">{otherParty?.full_name}</p>
                                    <p className="text-sm text-muted-foreground truncate" style={{ maxWidth: '200px' }}>{convo.last_message || 'No messages yet.'}</p>
                                </div>
                            </div>
                            {convo.last_message_at && (
                                <span className="text-xs text-muted-foreground">
                                    {new Date(convo.last_message_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            )}
                        </div>
                    )
                })}
            </div>
        </CardContent>
        {isChatModalOpen && selectedConversation && (
            <ChatModal
                isOpen={isChatModalOpen}
                onClose={() => setChatModalOpen(false)}
                conversationId={selectedConversation.id}
            />
        )}
      </Card>
    );

    if (isTabContent) {
        return ChatContent;
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                {ChatContent}
            </DialogContent>
        </Dialog>
    );
};

export default UniversalChatWidget;
