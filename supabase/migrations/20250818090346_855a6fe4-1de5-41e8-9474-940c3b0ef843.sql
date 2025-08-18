-- Drop existing trigger and recreate with updated function
DROP TRIGGER IF EXISTS notify_chat_message_trigger ON public.chat_messages;

-- Create trigger for new chat messages  
CREATE TRIGGER notify_chat_message_trigger
  AFTER INSERT ON public.chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_chat_message();