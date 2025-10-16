// FILE: src/components/UniversalChat.tsx

import { useState, useEffect, useRef } from "react";
import { useChat, Message } from "@/contexts/ChatContext";
import { useAuth } from "@/hooks/useAuth";
import { useTalentBookingLimit } from "@/hooks/useTalentBookingLimit";
import { useAdvancedChatFilter } from "@/hooks/useAdvancedChatFilter";
import { useRecipientTalentStatus } from "@/hooks/useRecipientTalentStatus";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Send, X, User, Crown, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom"; // ✅ Added import

export const UniversalChat = () => {
  const { isOpen, closeChat, messages, sendMessage, loadingMessages, channelInfo, setUserInteracting } = useChat();
  const { user } = useAuth();
  const { canReceiveBooking, isProUser, isTalent } = useTalentBookingLimit();
  const { isRecipientNonProTalent } = useRecipientTalentStatus(channelInfo, user?.id);

  // Log filter parameters for debugging
  console.log(
    "[CHAT FILTER DEBUG] isTalent:",
    isTalent,
    "isProUser:",
    isProUser,
    "isRecipientNonProTalent:",
    isRecipientNonProTalent,
  );
  console.log(
    "[CHAT FILTER DEBUG] Filter bypass calculation: isProUser ||(!isTalent && !isRecipientNonProTalent) =",
    isProUser || (!isTalent && !isRecipientNonProTalent),
  );

  const { filterMessage, updateConversationBuffer } = useAdvancedChatFilter(
    channelInfo,
    user?.id,
    isProUser || (!isTalent && !isRecipientNonProTalent),
    isTalent, // <--- Add this
  );
  const { toast } = useToast();
  const navigate = useNavigate(); // ✅ Added safely
  const [newMessage, setNewMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [showFilteredMessage, setShowFilteredMessage] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loadingMessages]);

  // Update conversation buffer when messages change
  useEffect(() => {
    if (messages.length > 0) {
      updateConversationBuffer(messages);
    }
  }, [messages]);

  // Communicate interaction state to context
  useEffect(() => {
    setUserInteracting(isTyping || isHovering || isFocused);
  }, [isTyping, isHovering, isFocused, setUserInteracting]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim() && user?.id) {
      console.log(
        "[CHAT SEND DEBUG] Attempting to send. isTalent:",
        isTalent,
        "isProUser:",
        isProUser,
        "isRecipientNonProTalent:",
        isRecipientNonProTalent,
      );

      // Apply advanced filtering for non-pro talents (sender is talent)
      if (isTalent && !isProUser) {
        console.log("[CHAT SEND DEBUG] Filtering as NON-PRO TALENT sender");
        const filterResult = filterMessage(newMessage);
        if (filterResult.isBlocked) {
          setShowFilteredMessage(filterResult.reason || "Message blocked");
          setNewMessage("");
          return;
        }
      }

      // Apply advanced filtering when bookers message non-pro talents (recipient is non-pro talent)
      if (!isTalent && isRecipientNonProTalent) {
        console.log("[CHAT SEND DEBUG] Filtering as BOOKER messaging NON-PRO TALENT");
        const filterResult = filterMessage(newMessage);
        if (filterResult.isBlocked) {
          toast({
            title: "Message Blocked",
            description: filterResult.reason || "This message is not allowed.",
            variant: "destructive",
          });
          setShowFilteredMessage(filterResult.reason || "This message is not allowed.");
          setNewMessage("");
          return;
        }
      }

      console.log("[CHAT SEND DEBUG] Message passed all filters, sending...");
      sendMessage(newMessage);
      setNewMessage("");
      setShowFilteredMessage(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-2 right-2 sm:bottom-8 sm:right-8 w-[calc(100%-1rem)] sm:w-[calc(100%-2rem)] max-w-sm h-[85vh] sm:h-[min(600px,80vh)] z-50">
      <Card
        className="w-full h-full flex flex-col shadow-2xl overflow-hidden"
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
      >
        <CardHeader className="flex flex-row items-center justify-between p-3 sm:p-4 border-b">
          <CardTitle className="text-sm sm:text-base font-semibold">
            {channelInfo?.type === "booking" ? "Booking Chat" : "Event Request Chat"}
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={closeChat} className="h-8 w-8 sm:h-10 sm:w-10">
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="p-0 flex-1 flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto p-2 sm:p-4 space-y-3 sm:space-y-4 min-h-0">
            {loadingMessages ? (
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-xs sm:text-sm text-muted-foreground">Start the conversation!</p>
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={cn(
                    "flex items-end gap-1.5 sm:gap-2",
                    msg.sender_id === user?.id ? "justify-end" : "justify-start",
                  )}
                >
                  {msg.sender_id !== user?.id && (
                    <Avatar className="h-6 w-6 sm:h-8 sm:w-8 flex-shrink-0">
                      <AvatarFallback>
                        <User className="h-3 w-3 sm:h-4 sm:w-4" />
                      </AvatarFallback>
                    </Avatar>
                  )}
                  <div
                    className={cn(
                      "max-w-[75%] sm:max-w-xs p-2 sm:p-3 rounded-2xl text-xs sm:text-sm break-words",
                      msg.sender_id === user?.id
                        ? "bg-primary text-primary-foreground rounded-br-none"
                        : "bg-muted rounded-bl-none",
                    )}
                  >
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                    <p
                      className={cn(
                        "text-[10px] sm:text-xs mt-1",
                        msg.sender_id === user?.id ? "text-primary-foreground/70" : "text-muted-foreground/70",
                      )}
                    >
                      {format(new Date(msg.created_at), "p")}
                    </p>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-2 sm:p-3 border-t bg-background flex-shrink-0">
            {/* Pro upgrade prompt for non-pro talents */}
            {isTalent && !isProUser && (
              <div className="mb-1.5 p-1.5 sm:p-2 bg-primary/5 dark:bg-primary/10 rounded border border-primary/20">
                <p className="text-[9px] sm:text-[10px] text-muted-foreground mb-1 leading-tight flex items-center gap-1">
                  <Crown className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-primary flex-shrink-0" />
                  <span>
                    <strong>Pro:</strong> Share contact info directly
                  </span>
                </p>
                <Button
                  size="sm"
                  onClick={() => {
                    navigate("/pricing"); // This opens the subscription page
                    closeChat(); // This immediately closes the chat window
                  }}
                  className="h-5 sm:h-6 text-[9px] sm:text-[10px] w-full"
                  variant="default"
                >
                  Upgrade
                </Button>
              </div>
            )}

            {/* Alert when bookers message non-pro talents */}
            {!isTalent && isRecipientNonProTalent && (
              <div className="mb-1.5 p-1.5 sm:p-2 bg-primary/5 dark:bg-primary/10 rounded border border-primary/20">
                <p className="text-[9px] sm:text-[10px] text-muted-foreground font-medium flex items-center gap-1 leading-tight">
                  <AlertTriangle className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-primary flex-shrink-0" />
                  <span>This talent can't receive contact details (Free plan)</span>
                </p>
              </div>
            )}

            {/* Filtered message notification */}
            {showFilteredMessage && (
              <div className="mb-1.5 p-1.5 sm:p-2 bg-destructive/10 rounded border border-destructive/20">
                <p className="text-[9px] sm:text-[10px] text-destructive font-medium leading-tight">
                  {showFilteredMessage}
                </p>
              </div>
            )}

            <form onSubmit={handleSendMessage} className="flex items-end gap-1.5 sm:gap-2">
              <Textarea
                value={newMessage}
                onChange={(e) => {
                  setNewMessage(e.target.value);
                  setIsTyping(e.target.value.length > 0);

                  if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

                  typingTimeoutRef.current = setTimeout(() => {
                    if (!isFocused) setIsTyping(false);
                  }, 5000);
                }}
                onFocus={() => setIsFocused(true)}
                onBlur={() => {
                  setIsFocused(false);
                  setTimeout(() => {
                    if (!isFocused) setIsTyping(false);
                  }, 1000);
                }}
                placeholder={
                  isTalent && !isProUser
                    ? "Upgrade to Pro to share contact details..."
                    : !isTalent && isRecipientNonProTalent
                      ? "This talent can't receive contact details (Free plan)..."
                      : "Type your message..."
                }
                className="resize-none min-h-[44px] max-h-[88px] sm:min-h-[40px] sm:max-h-[80px] text-xs sm:text-sm leading-tight py-2 px-2.5 sm:px-3 placeholder:text-[10px] sm:placeholder:text-xs placeholder:text-muted-foreground/70"
                rows={1}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage(e);
                  }
                }}
              />
              <Button
                type="submit"
                size="icon"
                className="h-[44px] w-[44px] sm:h-[40px] sm:w-[40px] flex-shrink-0"
                disabled={!newMessage.trim()}
              >
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
