import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function PrivacyPolicy() {
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
          <h1 className="text-display mb-8">Privacy Policy</h1>
          
          <Card className="glass-card">
            <CardContent className="p-8 space-y-8">
              <div>
                <p className="text-muted-foreground mb-6">
                  Last updated: {new Date().toLocaleDateString()}
                </p>
                
                <p className="mb-6">
                  At Qtalent.live, we are committed to protecting your privacy and ensuring the security of your personal information. This Privacy Policy explains how we collect, use, and safeguard your data when you use our platform.
                </p>
              </div>

              <section>
                <h2 className="text-2xl font-bold mb-4">Information We Collect</h2>
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Personal Information</h3>
                    <p className="text-muted-foreground">
                      We collect information you provide directly to us, including:
                    </p>
                    <ul className="list-disc list-inside text-muted-foreground mt-2 space-y-1">
                      <li>Name, email address, phone number, and contact details</li>
                      <li>Profile information including photos, biography, and professional details</li>
                      <li>Payment and billing information (processed securely through PayPal)</li>
                      <li>Communication preferences and marketing consent</li>
                      <li>Messages and content you send through our platform</li>
                    </ul>
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Usage Information</h3>
                    <p className="text-muted-foreground">
                      We automatically collect information about how you use our platform:
                    </p>
                    <ul className="list-disc list-inside text-muted-foreground mt-2 space-y-1">
                      <li>Device information (browser type, operating system, IP address)</li>
                      <li>Log data (access times, pages viewed, links clicked)</li>
                      <li>Location data (general geographic location based on IP address)</li>
                      <li>Cookies and similar tracking technologies</li>
                    </ul>
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Booking and Transaction Information</h3>
                    <p className="text-muted-foreground">
                      When you create bookings or process transactions, we collect:
                    </p>
                    <ul className="list-disc list-inside text-muted-foreground mt-2 space-y-1">
                      <li>Event details (date, location, type, duration)</li>
                      <li>Transaction history and payment records</li>
                      <li>Reviews and ratings you provide or receive</li>
                    </ul>
                  </div>
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-bold mb-4">How We Use Your Information</h2>
                <p className="text-muted-foreground mb-4">
                  We use the information we collect for the following purposes:
                </p>
                <ul className="space-y-2 text-muted-foreground">
                  <li>• <strong>Service Delivery:</strong> Provide, maintain, and improve our platform and services</li>
                  <li>• <strong>Booking Management:</strong> Facilitate bookings between talent and event organizers</li>
                  <li>• <strong>Payment Processing:</strong> Process Pro subscriptions and manage billing through PayPal</li>
                  <li>• <strong>Communication:</strong> Send booking confirmations, updates, and respond to inquiries</li>
                  <li>• <strong>Personalization:</strong> Customize your experience based on preferences and location</li>
                  <li>• <strong>Analytics:</strong> Analyze platform usage to improve features and user experience</li>
                  <li>• <strong>Security:</strong> Detect and prevent fraud, abuse, and security incidents</li>
                  <li>• <strong>Legal Compliance:</strong> Comply with legal obligations and enforce our terms</li>
                  <li>• <strong>Marketing:</strong> Send promotional materials (with your consent, where required)</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-bold mb-4">Information Sharing</h2>
                <p className="text-muted-foreground mb-4">
                  We do not sell, trade, or otherwise transfer your personal information to third parties except in the following circumstances:
                </p>
                <ul className="space-y-2 text-muted-foreground">
                  <li>• With your explicit consent</li>
                  <li>• To provide services you've requested</li>
                  <li>• To comply with legal obligations</li>
                  <li>• To protect our rights and safety</li>
                  <li>• With trusted service providers who assist in operating our platform</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-bold mb-4">Data Security</h2>
                <p className="text-muted-foreground mb-4">
                  We implement comprehensive security measures to protect your personal information:
                </p>
                <ul className="space-y-2 text-muted-foreground">
                  <li>• <strong>Encryption:</strong> Data transmitted between your browser and our servers is encrypted using SSL/TLS</li>
                  <li>• <strong>Secure Storage:</strong> Personal data is stored on secure servers with restricted access</li>
                  <li>• <strong>Payment Security:</strong> Payment information is processed through PayPal's secure infrastructure</li>
                  <li>• <strong>Access Controls:</strong> We limit access to personal information to authorized personnel only</li>
                  <li>• <strong>Regular Audits:</strong> We conduct regular security assessments and updates</li>
                </ul>
                <p className="text-muted-foreground mt-4">
                  While we strive to protect your information, no method of transmission over the internet or electronic storage is 100% secure. We cannot guarantee absolute security but continuously work to maintain the highest standards.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold mb-4">Your Rights</h2>
                <p className="text-muted-foreground mb-4">
                  Depending on your location, you may have the following rights regarding your personal information:
                </p>
                <ul className="space-y-2 text-muted-foreground">
                  <li>• <strong>Access:</strong> Request a copy of the personal information we hold about you</li>
                  <li>• <strong>Correction:</strong> Request correction of inaccurate or incomplete information</li>
                  <li>• <strong>Deletion:</strong> Request deletion of your personal information (right to be forgotten)</li>
                  <li>• <strong>Data Portability:</strong> Receive your data in a structured, machine-readable format</li>
                  <li>• <strong>Objection:</strong> Object to processing of your personal information</li>
                  <li>• <strong>Restriction:</strong> Request restriction of processing in certain circumstances</li>
                  <li>• <strong>Withdraw Consent:</strong> Withdraw consent for processing where we rely on consent</li>
                  <li>• <strong>Opt-Out:</strong> Opt out of marketing communications at any time</li>
                </ul>
                <p className="text-muted-foreground mt-4">
                  To exercise any of these rights, please contact us at privacy@qtalent.live. We will respond to your request within 30 days.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold mb-4">Cookies and Tracking</h2>
                <p className="text-muted-foreground mb-4">
                  We use cookies and similar tracking technologies to enhance your experience:
                </p>
                <ul className="space-y-2 text-muted-foreground">
                  <li>• <strong>Essential Cookies:</strong> Required for the platform to function properly</li>
                  <li>• <strong>Analytics Cookies:</strong> Help us understand how users interact with our platform</li>
                  <li>• <strong>Preference Cookies:</strong> Remember your settings and preferences</li>
                </ul>
                <p className="text-muted-foreground mt-4">
                  You can control cookies through your browser settings, but disabling certain cookies may affect platform functionality.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold mb-4">Data Retention</h2>
                <p className="text-muted-foreground">
                  We retain your personal information for as long as necessary to provide our services and comply with legal obligations. When you delete your account, we will delete or anonymize your personal information within 90 days, except where we are required to retain it for legal, tax, or regulatory purposes.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold mb-4">Children's Privacy</h2>
                <p className="text-muted-foreground">
                  Our platform is not intended for users under the age of 18. We do not knowingly collect personal information from children. If you believe we have inadvertently collected information from a child, please contact us immediately.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold mb-4">International Data Transfers</h2>
                <p className="text-muted-foreground">
                  Your information may be transferred to and processed in countries other than your country of residence. We ensure appropriate safeguards are in place to protect your information in accordance with this Privacy Policy and applicable data protection laws.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold mb-4">Changes to This Policy</h2>
                <p className="text-muted-foreground">
                  We may update this Privacy Policy from time to time. We will notify you of any material changes by posting the new Privacy Policy on this page and updating the "Last updated" date. Your continued use of the platform after changes are posted constitutes acceptance of the updated policy.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold mb-4">Contact Us</h2>
                <p className="text-muted-foreground">
                  If you have any questions about this Privacy Policy or our data practices, please contact us at privacy@qtalent.live.
                </p>
              </section>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}