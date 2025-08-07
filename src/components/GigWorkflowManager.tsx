import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface GigWorkflowManagerProps {
  userId: string;
  onGigUpdate?: () => void;
}

export function GigWorkflowManager({ userId, onGigUpdate }: GigWorkflowManagerProps) {
  const { toast } = useToast();

  useEffect(() => {
    // MASTER TASK 4: Real-time monitoring of the complete gig workflow
    const gigWorkflowChannel = supabase
      .channel('gig-workflow-manager')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'gig_applications'
        },
        (payload) => {
          const gigApp = payload.new;
          const oldGigApp = payload.old;
          
          // Only show notifications for relevant status changes
          if (gigApp.status !== oldGigApp?.status) {
            console.log('Gig application status changed:', {
              gigAppId: gigApp.id,
              gigId: gigApp.gig_id,
              talentId: gigApp.talent_id,
              oldStatus: oldGigApp?.status,
              newStatus: gigApp.status
            });

            // MASTER TASK 4: Handle specific gig workflow transitions
            switch (gigApp.status) {
              case 'invoice_sent':
                toast({
                  title: "Gig Invoice Sent 📄",
                  description: "Talent has sent an invoice for the gig opportunity.",
                });
                break;

              case 'confirmed':
                toast({
                  title: "Gig Confirmed! 🎉",
                  description: "Payment successful! Your gig is now confirmed.",
                });
                break;

              case 'interested':
                if (oldGigApp?.status === 'invoice_sent') {
                  toast({
                    title: "Gig Invoice Declined",
                    description: "The gig invoice was declined. The talent can send a new one.",
                  });
                }
                break;
            }

            // Trigger refresh callback
            if (onGigUpdate) {
              onGigUpdate();
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(gigWorkflowChannel);
    };
  }, [userId, onGigUpdate, toast]);

  // This component doesn't render anything - it's just for workflow management
  return null;
}