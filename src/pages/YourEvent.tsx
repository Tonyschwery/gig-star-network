// FILE: src/pages/YourEvent.tsx

import React from 'react';
import { Header } from '@/components/Header';
import { EventRequestForm } from '@/components/EventRequestForm'; // 1. Import the new form component

const YourEvent = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold gradient-text">Tell Us About Your Event</h1>
            <p className="text-muted-foreground mt-2">
              Provide the details below, and our team will match you with the perfect talent.
            </p>
          </div>
          
          {/* 2. The placeholder is now replaced with the actual form component */}
          <EventRequestForm />

        </div>
      </div>
    </div>
  );
};

export default YourEvent;