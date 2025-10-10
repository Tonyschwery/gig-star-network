import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Shield, CreditCard, Lock, UserCheck, MessageSquare, AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function TrustSafety() {
  const navigate = useNavigate();

  const safetyFeatures = [
    {
      icon: <UserCheck className="h-8 w-8 text-accent" />,
      title: "Verified Talent",
      description: "All performers undergo thorough background checks and identity verification before joining our platform."
    },
    {
      icon: <CreditCard className="h-8 w-8 text-accent" />,
      title: "Secure Connections",
      description: "Safe and secure platform for connecting talent with event organizers through verified profiles."
    },
    {
      icon: <MessageSquare className="h-8 w-8 text-accent" />,
      title: "Monitored Communications",
      description: "All messages are filtered for safety and professionalism to maintain a secure environment."
    },
    {
      icon: <Shield className="h-8 w-8 text-accent" />,
      title: "Insurance Coverage",
      description: "Comprehensive insurance coverage for events and performances booked through our platform."
    }
  ];

  const guidelines = [
    {
      title: "For Event Organizers",
      items: [
        "Book through our official platform for protection",
        "Verify talent profiles and credentials before booking",
        "Communicate event details clearly in advance",
        "Keep all communication within platform messaging",
        "Report suspicious behavior immediately",
        "Never share sensitive personal or financial information outside platform"
      ]
    },
    {
      title: "For Talent",
      items: [
        "Keep profile accurate and up to date",
        "Review event details carefully before accepting",
        "Trust your instincts - decline if uncomfortable",
        "Maintain professional communication",
        "Never share personal banking information",
        "Report inappropriate requests or harassment"
      ]
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
          Trust & <span className="text-accent">Safety</span>
        </h1>
        <p className="text-subhead max-w-3xl mx-auto">
          Your safety and security are our top priorities. Learn about our comprehensive measures to protect both talent and event organizers.
        </p>
      </section>

      {/* Safety Features */}
      <section className="container mx-auto px-4 mb-20">
        <div className="text-center mb-12">
          <h2 className="text-headline mb-4">Our Safety Features</h2>
          <p className="text-subhead">Multiple layers of protection for peace of mind</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {safetyFeatures.map((feature, index) => (
            <Card key={index} className="glass-card text-center">
              <CardContent className="pt-8 pb-6">
                <div className="flex justify-center mb-4">
                  {feature.icon}
                </div>
                <h3 className="font-semibold mb-3">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Verification Process */}
      <section className="bg-secondary/30 py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-headline mb-4">Talent Verification Process</h2>
            <p className="text-subhead">How we ensure quality and safety</p>
          </div>

          <div className="max-w-4xl mx-auto">
            <Card className="glass-card">
              <CardContent className="p-8">
                <div className="grid md:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <div className="flex items-start space-x-4">
                      <div className="bg-accent text-accent-foreground rounded-full w-8 h-8 flex items-center justify-center font-bold flex-shrink-0">
                        1
                      </div>
                      <div>
                        <h3 className="font-semibold mb-2">Identity Verification</h3>
                        <p className="text-sm text-muted-foreground">
                          Government-issued ID verification and address confirmation.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-4">
                      <div className="bg-accent text-accent-foreground rounded-full w-8 h-8 flex items-center justify-center font-bold flex-shrink-0">
                        2
                      </div>
                      <div>
                        <h3 className="font-semibold mb-2">Background Check</h3>
                        <p className="text-sm text-muted-foreground">
                          Professional background screening for safety and reliability.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-4">
                      <div className="bg-accent text-accent-foreground rounded-full w-8 h-8 flex items-center justify-center font-bold flex-shrink-0">
                        3
                      </div>
                      <div>
                        <h3 className="font-semibold mb-2">Skill Assessment</h3>
                        <p className="text-sm text-muted-foreground">
                          Portfolio review and skill verification by our expert team.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="flex items-start space-x-4">
                      <div className="bg-accent text-accent-foreground rounded-full w-8 h-8 flex items-center justify-center font-bold flex-shrink-0">
                        4
                      </div>
                      <div>
                        <h3 className="font-semibold mb-2">Reference Check</h3>
                        <p className="text-sm text-muted-foreground">
                          Verification of previous performance experience and client feedback.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-4">
                      <div className="bg-accent text-accent-foreground rounded-full w-8 h-8 flex items-center justify-center font-bold flex-shrink-0">
                        5
                      </div>
                      <div>
                        <h3 className="font-semibold mb-2">Insurance Verification</h3>
                        <p className="text-sm text-muted-foreground">
                          Confirmation of professional liability and equipment insurance.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-4">
                      <div className="bg-accent text-accent-foreground rounded-full w-8 h-8 flex items-center justify-center font-bold flex-shrink-0">
                        6
                      </div>
                      <div>
                        <h3 className="font-semibold mb-2">Approval</h3>
                        <p className="text-sm text-muted-foreground">
                          Final review and approval to join the Qtalent.live community.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Safety Guidelines */}
      <section className="container mx-auto px-4 py-20">
        <div className="text-center mb-12">
          <h2 className="text-headline mb-4">Safety Guidelines</h2>
          <p className="text-subhead">Best practices for a safe experience</p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto">
          {guidelines.map((section, index) => (
            <Card key={index} className="glass-card">
              <CardHeader>
                <CardTitle>{section.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {section.items.map((item, idx) => (
                    <li key={idx} className="flex items-start space-x-3">
                      <Shield className="h-5 w-5 text-accent flex-shrink-0 mt-0.5" />
                      <span className="text-sm">{item}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Emergency Contact */}
      <section className="bg-destructive/10 border border-destructive/20 rounded-lg mx-4 mb-20">
        <div className="container mx-auto px-6 py-12 text-center">
          <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h3 className="text-xl font-bold mb-4">Need to Report an Issue?</h3>
          <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
            If you encounter any safety concerns, inappropriate behavior, or suspicious activity, 
            please contact our trust and safety team immediately.
          </p>
          <div className="space-y-3">
            <Button variant="destructive">
              Report Safety Concern
            </Button>
            <div className="text-sm text-muted-foreground">
              Available 24/7 • Response within 1 hour
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}