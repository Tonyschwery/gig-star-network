-- Harden function by setting a fixed search_path
CREATE OR REPLACE FUNCTION public.notify_message_received()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
    booking record;
begin
    -- Look up the booking via the conversation
    SELECT b.*
    INTO booking
    FROM public.bookings b
    JOIN public.conversations c 
      ON c.booking_id = b.id
    WHERE c.id = NEW.conversation_id;

    -- You can add any logic here that depends on the booking record
    -- For now, just notify the frontend that a message was received
    perform pg_notify('message_received', NEW.id::text);

    return NEW;
end;
$function$;