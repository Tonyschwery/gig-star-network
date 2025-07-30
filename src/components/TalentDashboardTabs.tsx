import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookingRequests } from "@/components/BookingRequests";
import { GigOpportunitiesIntegrated } from "@/components/GigOpportunitiesIntegrated";
import { Calendar, Sparkles } from "lucide-react";

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

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="grid w-full grid-cols-2 mb-6">
        <TabsTrigger value="bookings" className="flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          Direct Bookings
        </TabsTrigger>
        <TabsTrigger value="gigs" className="flex items-center gap-2">
          <Sparkles className="h-4 w-4" />
          Gig Opportunities
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