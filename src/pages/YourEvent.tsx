import { Header } from "@/components/Header";
import { BookingForm } from "@/components/BookingForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, HelpCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function YourEvent() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="pt-24 container mx-auto px-4 pb-12">
        <div className="max-w-4xl mx-auto">
          {/* Page Header */}
          <div className="mb-8">
            <Button 
              variant="ghost" 
              onClick={() => navigate('/')}
              className="mb-4 hover:bg-accent"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Button>
            
            <div className="flex items-center gap-3 mb-4">
              <HelpCircle className="h-8 w-8 text-brand-primary" />
              <h1 className="text-4xl font-bold gradient-text">Tell us about your event</h1>
            </div>
            
            <p className="text-lg text-muted-foreground max-w-2xl">
              Can't find the perfect talent for your event? Let us help! Fill out the details below and our pro talents will get in touch with you to discuss your requirements.
            </p>
          </div>

          {/* Form Card */}
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="text-2xl text-center">Event Request Form</CardTitle>
              <p className="text-center text-muted-foreground">
                Our talented artists will review your request and reach out to you directly
              </p>
            </CardHeader>
            <CardContent className="p-8">
              <BookingForm
                talentId="public-request"
                talentName="Personal Assistance Request"
                onClose={() => navigate('/')}
                onSuccess={() => navigate('/')}
              />
            </CardContent>
          </Card>

          {/* Benefits Section */}
          <div className="mt-12 grid md:grid-cols-3 gap-6">
            <Card className="p-6 text-center">
              <div className="text-3xl mb-4">🎯</div>
              <h3 className="font-semibold mb-2">Perfect Match</h3>
              <p className="text-sm text-muted-foreground">
                We'll match you with talents that perfectly fit your event style and budget
              </p>
            </Card>
            <Card className="p-6 text-center">
              <div className="text-3xl mb-4">⚡</div>
              <h3 className="font-semibold mb-2">Quick Response</h3>
              <p className="text-sm text-muted-foreground">
                Our pro talents typically respond within 24 hours
              </p>
            </Card>
            <Card className="p-6 text-center">
              <div className="text-3xl mb-4">💎</div>
              <h3 className="font-semibold mb-2">Premium Quality</h3>
              <p className="text-sm text-muted-foreground">
                Only verified pro talents with excellent reviews will contact you
              </p>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}