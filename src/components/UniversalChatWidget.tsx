import {
    Dialog,
    DialogContent,
} from "@/components/ui/dialog"
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
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

    useEffect(() => {
        const fetchConversations = async () => {
            if (!user) return;

            setLoading(true);

            let query = supabase
                .from('conversations')
                .select(`
                    id,
                    last_message,
                    last_message_at,
                    booking:bookings (
                        id,
                        user_id,
                        talent_id,
                        booker:profiles!bookings_user_id_fkey (id, full_name, avatar_url),
                        talent:talent_profiles (id, user_id, talent_user:profiles!user_id(id, full_name, avatar_url))
                    )
                `);

            if (userMode === 'talent') {
                const { data: talentProfile, error: profileError } = await supabase
                    .from('talent_profiles')
                    .select('id')
                    .eq('user_id', user.id)
                    .single();
                
                if (talentProfile && !profileError) {
                    query = query.eq('booking.talent_id', talentProfile.id);
                } else {
                    setConversations([]);
                    setLoading(false);
                    if (profileError) console.error("Error fetching talent profile for chat:", profileError);
                    return;
                }
            } else { // userMode is 'booker'
                query = query.eq('booking.user_id', user.id);
            }

            const { data, error } = await query.order('last_message_at', { ascending: false, nullsFirst: false });

            if (error) {
                console.error('Error fetching conversations:', error);
            } else {
                setConversations(data || []);
            }
            setLoading(false);
        };

        fetchConversations();
    }, [user, userMode]);

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
                    const otherParty = userMode === 'talent' ? convo.booking?.booker : convo.booking?.talent?.talent_user;
                    if (!otherParty) return null; // Safety check
                    return (
                        <div key={convo.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted cursor-pointer" onClick={() => handleConversationClick(convo)}>
                            <div className="flex items-center overflow-hidden">
                                <Avatar>
                                    <AvatarImage src={otherParty?.avatar_url} />
                                    <AvatarFallback>{otherParty?.full_name?.[0]?.toUpperCase()}</AvatarFallback>
                                </Avatar>
                                <div className="ml-4">
                                    <p className="font-semibold">{otherParty?.full_name}</p>
                                    <p className="text-sm text-muted-foreground truncate" style={{ maxWidth: '200px' }}>{convo.last_message || 'No messages yet.'}</p>
                                </div>
                            </div>
                            {convo.last_message_at && (
                                <span className="text-xs text-muted-foreground flex-shrink-0 ml-2">
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
