import { Header } from "@/components/Header";
import { BookingForm } from "@/components/BookingForm"; // Uses our new smarter form
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, HelpCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
//stk
export default function YourEvent() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="pt-24 container mx-auto px-4 pb-12">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" /> Back
            </Button>
            <div className="flex items-center gap-3 mb-4">
              <HelpCircle className="h-8 w-8 text-primary" />
              <h1 className="text-4xl font-bold">Tell us about your event</h1>
            </div>
            <p className="text-lg text-muted-foreground max-w-2xl">
              Fill out the details below. Our team will review your request, and Pro talents who match your event's location will also be able to contact you directly.
            </p>
          </div>
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="text-2xl text-center">Event Request Form</CardTitle>
            </CardHeader>
            <CardContent className="p-8">
              <BookingForm />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
