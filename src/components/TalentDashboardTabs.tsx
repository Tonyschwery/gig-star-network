// PASTE THIS ENTIRE CODE BLOCK, REPLACING THE OLD FILE

import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookingRequests } from "@/components/BookingRequests";
import { GigOpportunitiesIntegrated } from "@/components/GigOpportunitiesIntegrated";
import { Calendar, Sparkles } from "lucide-react";
import { Button } from "./ui/button";

interface TalentDashboardTabsProps {
  talentId: string;
  isProSubscriber: boolean;
  onUpgrade: () => void; // Function to handle upgrade click
}

export const TalentDashboardTabs = ({ talentId, isProSubscriber, onUpgrade }: TalentDashboardTabsProps) => {
  return (
    <Tabs defaultValue="bookings" className="w-full">
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
        {isProSubscriber ? (
          <GigOpportunitiesIntegrated />
        ) : (
          <div className="text-center p-8 border rounded-lg bg-card">
              <h3 className="font-bold text-xl mb-2">This is a Pro Feature</h3>
              <p className="text-muted-foreground mb-4">Upgrade to Pro to view and apply for exclusive gig opportunities.</p>
              <Button onClick={onUpgrade}>Upgrade to Pro</Button>
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
};