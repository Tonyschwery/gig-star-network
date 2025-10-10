// FILE: src/pages/YourEvent.tsx

import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { EventRequestForm } from '@/components/EventRequestForm';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

const YourEvent = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  
  // Redirect to auth if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth', { state: { intent: 'event-form', mode: 'booker' } });
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(-1)}
            className="mb-4 flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
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