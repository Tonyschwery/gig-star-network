import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Users, Search, Calendar, MessageSquare, CreditCard, CheckCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function HowItWorks() {
  const navigate = useNavigate();

  const steps = [
    {
      icon: <Search className="h-8 w-8 text-accent" />,
      title: "Discover Talents",
      description: "Browse our curated selection of verified performers, musicians, and creators. Filter by location, type, and budget to find the perfect match for your event."
    },
    {
      icon: <MessageSquare className="h-8 w-8 text-accent" />,
      title: "Connect & Discuss",
      description: "Chat directly with talent to discuss your event details, requirements, and expectations. Our messaging system keeps everything organized."
    },
    {
      icon: <Calendar className="h-8 w-8 text-accent" />,
      title: "Book & Confirm Details",
      description: "Once you've agreed on terms and payment arrangements, confirm your booking. Get instant confirmation and event details."
    },
    {
      icon: <CheckCircle className="h-8 w-8 text-accent" />,
      title: "Enjoy Your Event",
      description: "Relax and enjoy your event knowing everything is taken care of. Our support team is available if you need any assistance."
    }
  ];

  const forTalents = [
    {
      icon: <Users className="h-8 w-8 text-accent" />,
      title: "Create Your Profile",
      description: "Showcase your skills with photos, videos, and detailed descriptions. Our verification process builds client trust."
    },
    {
      icon: <MessageSquare className="h-8 w-8 text-accent" />,
      title: "Receive Requests",
      description: "Get booking requests directly in your dashboard. Chat with potential clients to discuss event details and negotiate terms."
    },
    {
      icon: <MessageSquare className="h-8 w-8 text-accent" />,
      title: "Agree on Payment Terms",
      description: "Discuss and agree on payment terms directly with clients. Share your preferred payment method privately - bank details, cash on delivery, or other arrangements that work for both parties."
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="container mx-auto px-4 pt-24 pb-8">
        <Button 
          variant="ghost" 
          onClick={() => navigate('/')}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Home
        </Button>
      </div>

      {/* Hero Section */}
      <section className="container mx-auto px-4 text-center mb-16">
        <h1 className="text-display mb-6">
          How <span className="text-accent">Qtalent.live</span> Works
        </h1>
        <p className="text-subhead max-w-3xl mx-auto">
          Connecting exceptional talent with amazing events in just a few simple steps.
        </p>
      </section>

      {/* For Event Organizers */}
      <section className="container mx-auto px-4 mb-20">
        <div className="text-center mb-12">
          <h2 className="text-headline mb-4">For Event Organizers</h2>
          <p className="text-subhead">Book amazing talent in four easy steps</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
          {steps.map((step, index) => (
            <Card key={index} className="glass-card text-center relative">
              <CardContent className="pt-8 pb-6">
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-accent text-accent-foreground rounded-full w-8 h-8 flex items-center justify-center font-bold">
                  {index + 1}
                </div>
                <div className="flex justify-center mb-4">
                  {step.icon}
                </div>
                <h3 className="font-semibold mb-3">{step.title}</h3>
                <p className="text-sm text-muted-foreground">{step.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="text-center">
          <Button 
            className="hero-button"
            onClick={() => navigate('/your-event')}
          >
            Start Booking Today
          </Button>
        </div>
      </section>

      {/* For Talents */}
      <section className="bg-secondary/30 py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-headline mb-4">For Talent</h2>
            <p className="text-subhead">Start earning from your performances</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mb-12">
            {forTalents.map((step, index) => (
              <Card key={index} className="glass-card text-center relative">
                <CardContent className="pt-8 pb-6">
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-accent text-accent-foreground rounded-full w-8 h-8 flex items-center justify-center font-bold">
                    {index + 1}
                  </div>
                  <div className="flex justify-center mb-4">
                    {step.icon}
                  </div>
                  <h3 className="font-semibold mb-3">{step.title}</h3>
                  <p className="text-sm text-muted-foreground">{step.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="text-center">
            <Button 
              className="hero-button"
              onClick={() => navigate('/auth')}
            >
              Join as a Talent
            </Button>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="text-center mb-12">
          <h2 className="text-headline mb-4">Why Choose Qtalent.live?</h2>
        </div>

        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <div className="flex items-start space-x-4">
              <div className="bg-accent/10 p-3 rounded-lg">
                <CheckCircle className="h-6 w-6 text-accent" />
              </div>
              <div>
                <h3 className="font-semibold mb-2">Verified Professionals</h3>
                <p className="text-muted-foreground">All talent goes through our verification process to ensure quality and reliability.</p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="bg-accent/10 p-3 rounded-lg">
                <CreditCard className="h-6 w-6 text-accent" />
              </div>
              <div>
                <h3 className="font-semibold mb-2">Flexible Payment Options</h3>
                <p className="text-muted-foreground">Discuss payment terms directly with talent. Choose from bank transfers, cash payments, or other mutually agreed arrangements.</p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="bg-accent/10 p-3 rounded-lg">
                <MessageSquare className="h-6 w-6 text-accent" />
              </div>
              <div>
                <h3 className="font-semibold mb-2">Direct Communication</h3>
                <p className="text-muted-foreground">Chat directly with talent to ensure your event vision becomes reality.</p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="bg-accent/10 p-3 rounded-lg">
                <Users className="h-6 w-6 text-accent" />
              </div>
              <div>
                <h3 className="font-semibold mb-2">24/7 Support</h3>
                <p className="text-muted-foreground">Our support team is here to help you every step of the way.</p>
              </div>
            </div>
          </div>

          <Card className="glass-card">
            <CardContent className="p-8 text-center">
              <h3 className="text-2xl font-bold mb-4">Ready to Get Started?</h3>
              <p className="text-muted-foreground mb-6">
                Join thousands of satisfied clients and talented performers who trust Qtalent.live for their events.
              </p>
              <div className="space-y-3">
                <Button 
                  className="hero-button w-full"
                  onClick={() => navigate('/your-event')}
                >
                  Book Talents
                </Button>
                <Button 
                  variant="outline"
                  className="w-full"
                  onClick={() => navigate('/auth')}
                >
                  Join as a Talent
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}