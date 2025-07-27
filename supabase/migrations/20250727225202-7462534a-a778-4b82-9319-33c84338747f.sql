-- Create function to trigger chat notifications
CREATE OR REPLACE FUNCTION public.trigger_chat_notification()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Trigger the chat notification edge function
  PERFORM net.http_post(
    url := 'https://myxizupccweukrxfdqmc.supabase.co/functions/v1/send-chat-notification',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    ),
    body := jsonb_build_object(
      'messageId', NEW.id,
      'conversationId', NEW.conversation_id,
      'senderType', NEW.sender_type
    )
  );
  
  RETURN NEW;
END;
$$;

-- Create trigger for chat notifications
CREATE TRIGGER trigger_chat_notification_trigger
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_chat_notification();