// PASTE THIS ENTIRE CODE BLOCK INTO src/pages/TalentDashboard.tsx

import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookingRequests } from "@/components/BookingRequests";
import { GigOpportunitiesIntegrated } from "@/components/GigOpportunitiesIntegrated"; 
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';

export const TalentDashboard = () => {
  const { profile, loading } = useAuth();

  if (loading) {
    return <div>Loading dashboard...</div>;
  }
  
  // This is a placeholder for the subscription upgrade logic
  const handleUpgrade = () => {
    // Navigate to pricing page or open Stripe checkout
    console.log("Upgrade to Pro clicked!");
    // You would typically navigate('/pricing') here
  };
  
  return (
    <div className="container mx-auto p-4">
        <Tabs defaultValue="bookings" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="bookings">Direct Bookings</TabsTrigger>
                <TabsTrigger value="gigs">Gig Opportunities</TabsTrigger>
            </TabsList>
            
            <TabsContent value="bookings">
                {/* This component will now correctly receive talentId from the profile */}
                {profile?.id && <BookingRequests talentId={profile.id} />}
            </TabsContent>
            
            <TabsContent value="gigs">
                {profile?.is_pro_subscriber ? (
                    // This is the component we've been fixing. It will now work.
                    <GigOpportunitiesIntegrated />
                ) : (
                    <div className="text-center p-8 border rounded-lg bg-card">
                        <h3 className="font-bold text-xl mb-2">This is a Pro Feature</h3>
                        <p className="text-muted-foreground mb-4">Upgrade to Pro to view and apply for exclusive gig opportunities.</p>
                        <Button onClick={handleUpgrade}>Upgrade to Pro</Button>
                    </div>
                )}
            </TabsContent>
        </Tabs>
    </div>
  );
};

export default TalentDashboard;