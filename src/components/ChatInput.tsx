import { useState, useCallback, memo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send } from "lucide-react";

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

const ChatInputComponent = ({ onSendMessage, disabled = false, placeholder = "Type your message..." }: ChatInputProps) => {
  const [message, setMessage] = useState("");

  console.log('🎪 ChatInput component rendered:', {
    message,
    disabled,
    timestamp: new Date().toISOString()
  });

  const handleSend = useCallback(() => {
    if (message.trim()) {
      onSendMessage(message.trim());
      setMessage("");
    }
  }, [message, onSendMessage]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    console.log('🎯 ChatInput onChange:', {
      value: e.target.value,
      previousValue: message,
      timestamp: new Date().toISOString(),
      activeElement: document.activeElement?.tagName
    });
    setMessage(e.target.value);
  }, [message]);

  return (
    <div className="flex gap-2">
      <Input
        placeholder={placeholder}
        value={message}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onFocus={() => console.log('🎯 ChatInput focused')}
        onBlur={() => console.log('😵‍💫 ChatInput blurred')}
        disabled={disabled}
        className="flex-1"
        autoComplete="off"
      />
      <Button 
        onClick={handleSend} 
        disabled={disabled || !message.trim()}
        size="sm"
        className="px-3"
      >
        <Send className="h-4 w-4" />
      </Button>
    </div>
  );
};

export const ChatInput = memo(ChatInputComponent);