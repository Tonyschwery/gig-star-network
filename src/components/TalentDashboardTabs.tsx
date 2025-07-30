import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookingRequests } from "@/components/BookingRequests";
import { GigOpportunitiesIntegrated } from "@/components/GigOpportunitiesIntegrated";
import { Calendar, Sparkles } from "lucide-react";
import { useDirectBookingNotifications } from "@/hooks/useDirectBookingNotifications";
import { useGigOpportunityNotifications } from "@/hooks/useGigOpportunityNotifications";

interface TalentDashboardTabsProps {
  talentId: string;
  isProSubscriber: boolean;
  onUpgrade: () => void;
}

export const TalentDashboardTabs = ({ 
  talentId, 
  isProSubscriber, 
  onUpgrade 
}: TalentDashboardTabsProps) => {
  const [activeTab, setActiveTab] = useState("bookings");
  
  // TASK 3: Real-time notification counts for each tab
  const { unreadCount: directBookingUnread } = useDirectBookingNotifications(talentId);
  const { unreadCount: gigOpportunityUnread } = useGigOpportunityNotifications(talentId);

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="grid w-full grid-cols-2 mb-6">
        <TabsTrigger value="bookings" className="flex items-center gap-2 relative">
          <Calendar className="h-4 w-4" />
          Direct Bookings
          {/* TASK 3: Red dot indicator for Direct Bookings */}
          {directBookingUnread > 0 && (
            <div className="absolute -top-1 -right-1 w-5 h-5 bg-destructive rounded-full flex items-center justify-center">
              <span className="text-xs text-white font-bold">
                {directBookingUnread > 99 ? '99+' : directBookingUnread}
              </span>
            </div>
          )}
        </TabsTrigger>
        <TabsTrigger value="gigs" className="flex items-center gap-2 relative">
          <Sparkles className="h-4 w-4" />
          Gig Opportunities
          {/* TASK 3: Red dot indicator for Gig Opportunities */}
          {gigOpportunityUnread > 0 && (
            <div className="absolute -top-1 -right-1 w-5 h-5 bg-destructive rounded-full flex items-center justify-center">
              <span className="text-xs text-white font-bold">
                {gigOpportunityUnread > 99 ? '99+' : gigOpportunityUnread}
              </span>
            </div>
          )}
        </TabsTrigger>
      </TabsList>
      
      <TabsContent value="bookings">
        <BookingRequests 
          talentId={talentId} 
          isProSubscriber={isProSubscriber}
        />
      </TabsContent>
      
      <TabsContent value="gigs">
        <GigOpportunitiesIntegrated 
          isProSubscriber={isProSubscriber}
          onUpgrade={onUpgrade}
          talentId={talentId}
        />
      </TabsContent>
    </Tabs>
  );
};