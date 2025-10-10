import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function TermsOfService() {
  const navigate = useNavigate();

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

      {/* Content */}
      <div className="container mx-auto px-4 pb-16">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-display mb-8">Terms of Service</h1>
          
          <Card className="glass-card">
            <CardContent className="p-8 space-y-8">
              <div>
                <p className="text-muted-foreground mb-6">
                  Last updated: {new Date().toLocaleDateString()}
                </p>
                
                <p className="mb-6">
                  Welcome to Qtalent.live. These Terms of Service ("Terms") govern your use of our platform and services. By accessing or using Qtalent.live, you agree to be bound by these Terms.
                </p>
              </div>

              <section>
                <h2 className="text-2xl font-bold mb-4">Platform Overview</h2>
                <p className="text-muted-foreground mb-3">
                  Qtalent.live is a marketplace platform connecting talented performers with event organizers. We facilitate bookings but are not party to the actual agreements between talents and organizers.
                </p>
                <p className="text-muted-foreground">
                  By using our platform, you agree to these Terms of Service and our Privacy Policy. If you do not agree with these terms, please do not use our services.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold mb-4">User Accounts</h2>
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Account Creation</h3>
                    <p className="text-muted-foreground">
                      You must be at least 18 years old to create an account. You must provide accurate, complete, and current information. You are responsible for maintaining the confidentiality of your account credentials and for all activities under your account.
                    </p>
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Account Types</h3>
                    <ul className="space-y-2 text-muted-foreground">
                      <li>• <strong>Talent:</strong> Create profiles, showcase skills, accept bookings</li>
                      <li>• <strong>Event Organizer (Booker):</strong> Search talent, make booking requests, manage events</li>
                    </ul>
                  </div>
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-bold mb-4">Platform Fees</h2>
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold mb-2">For Talent</h3>
                    <ul className="space-y-2 text-muted-foreground">
                      <li>• Pro subscription: Monthly fee for enhanced features and unlimited messaging</li>
                      <li>• Free accounts: Limited messaging and profile features</li>
                    </ul>
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-semibold mb-2">For Event Organizers</h3>
                    <p className="text-muted-foreground">
                      Creating an account and connecting with talent is completely free. Payment arrangements are made directly between talent and bookers.
                    </p>
                  </div>
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-bold mb-4">Booking Terms</h2>
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Booking Process</h3>
                    <p className="text-muted-foreground">
                      All bookings must be initiated through our platform. Payment arrangements are made directly between talent and bookers.
                    </p>
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Cancellation Policy</h3>
                    <p className="text-muted-foreground">
                      Cancellation terms are agreed upon between talent and client. We recommend establishing clear cancellation policies before confirming bookings.
                    </p>
                  </div>
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-bold mb-4">Subscription & Payment Terms</h2>
                <ul className="space-y-2 text-muted-foreground">
                  <li>• Pro subscriptions are processed securely through PayPal</li>
                  <li>• Subscription fees are non-refundable</li>
                  <li>• Subscriptions can be cancelled at any time through your account</li>
                  <li>• Payment arrangements between talent and bookers are made independently</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-bold mb-4">User Conduct</h2>
                <p className="text-muted-foreground mb-4">
                  Users must:
                </p>
                <ul className="space-y-2 text-muted-foreground">
                  <li>• Provide accurate information in profiles and communications</li>
                  <li>• Communicate respectfully and professionally</li>
                  <li>• Honor all confirmed bookings and agreements</li>
                  <li>• Comply with all applicable laws and regulations</li>
                  <li>• Report inappropriate behavior or safety concerns</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-bold mb-4">Prohibited Activities</h2>
                <ul className="space-y-2 text-muted-foreground">
                  <li>• Attempting to circumvent platform fees</li>
                  <li>• Posting false or misleading information</li>
                  <li>• Harassment or inappropriate behavior</li>
                  <li>• Sharing contact information to arrange off-platform deals</li>
                  <li>• Using the platform for illegal activities</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-bold mb-4">Limitation of Liability</h2>
                <p className="text-muted-foreground">
                  Qtalent.live acts as a platform facilitating connections between talent and clients. We are not responsible for the quality of performances, disputes between parties, or damages arising from bookings.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold mb-4">Termination</h2>
                <p className="text-muted-foreground">
                  We reserve the right to suspend or terminate accounts that violate these Terms. Users may also terminate their accounts at any time through their account settings.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold mb-4">Changes to Terms</h2>
                <p className="text-muted-foreground">
                  We may update these Terms from time to time. Users will be notified of significant changes, and continued use of the platform constitutes acceptance of the updated Terms.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold mb-4">Contact Information</h2>
                <p className="text-muted-foreground">
                  For questions about these Terms, please contact us at legal@qtalent.live.
                </p>
              </section>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}