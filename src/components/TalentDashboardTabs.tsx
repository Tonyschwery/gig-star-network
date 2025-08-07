// PASTE THIS SAFE, REVERTED CODE BLOCK

import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookingRequests } from "@/components/BookingRequests";
import { GigOpportunitiesIntegrated } from "@/components/GigOpportunitiesIntegrated";
import { Calendar, Sparkles } from "lucide-react";

// Assuming these notification hooks exist from previous versions
import { useDirectBookingNotifications } from "@/hooks/useDirectBookingNotifications";
import { useGigOpportunityNotifications } from "@/hooks/useGigOpportunityNotifications";

interface TalentDashboardProps {
  talentId: string;
  isProSubscriber: boolean;
  onUpgrade: () => void;
}

export const TalentDashboard = ({ talentId, isProSubscriber, onUpgrade }: TalentDashboardProps) => {
  const [activeTab, setActiveTab] = useState("bookings");
  
  // Using simplified placeholders for notifications to ensure no crashes
  const directBookingUnread = useDirectBookingNotifications(talentId)?.unreadCount || 0;
  const gigOpportunityUnread = useGigOpportunityNotifications(talentId)?.unreadCount || 0;

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="grid w-full grid-cols-2 mb-6">
        <TabsTrigger value="bookings" className="relative">
          <Calendar className="h-4 w-4 mr-2" />
          Direct Bookings
          {directBookingUnread > 0 && (
            <div className="absolute -top-1 -right-1 w-5 h-5 bg-destructive rounded-full flex items-center justify-center">
              <span className="text-xs text-white font-bold">{directBookingUnread}</span>
            </div>
          )}
        </TabsTrigger>
        <TabsTrigger value="gigs" className="relative">
          <Sparkles className="h-4 w-4 mr-2" />
          Gig Opportunities
          {gigOpportunityUnread > 0 && (
            <div className="absolute -top-1 -right-1 w-5 h-5 bg-destructive rounded-full flex items-center justify-center">
              <span className="text-xs text-white font-bold">{gigOpportunityUnread}</span>
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
        {isProSubscriber ? (
          <GigOpportunitiesIntegrated />
        ) : (
          <div className="text-center p-8 border rounded-lg">
              <h3 className="font-bold">This is a Pro Feature</h3>
              <p>Upgrade to Pro to view and apply for exclusive gig opportunities.</p>
              <button onClick={onUpgrade} className="mt-4 bg-primary text-primary-foreground p-2 rounded">Upgrade Now</button>
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
};

// You might need to add "export default TalentDashboard;" at the end
// if the original file had it.