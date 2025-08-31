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
                      We collect information you provide directly to us, such as when you create an account, update your profile, or communicate with us. This includes your name, email address, phone number, and profile information.
                    </p>
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Usage Information</h3>
                    <p className="text-muted-foreground">
                      We collect information about how you use our platform, including the pages you visit, features you use, and actions you take.
                    </p>
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Subscription Information</h3>
                    <p className="text-muted-foreground">
                      When you subscribe to Pro services, we collect subscription information processed securely through PayPal and our payment partners.
                    </p>
                  </div>
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-bold mb-4">How We Use Your Information</h2>
                <ul className="space-y-2 text-muted-foreground">
                  <li>• Provide and improve our services</li>
                  <li>• Process Pro subscription services</li>
                  <li>• Facilitate connections between talent and bookers</li>
                  <li>• Send you updates about our services</li>
                  <li>• Provide customer support</li>
                  <li>• Ensure platform safety and security</li>
                  <li>• Comply with legal obligations</li>
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
                <p className="text-muted-foreground">
                  We implement appropriate security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. However, no method of transmission over the internet is 100% secure.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold mb-4">Your Rights</h2>
                <p className="text-muted-foreground mb-4">
                  Depending on your location, you may have the following rights regarding your personal information:
                </p>
                <ul className="space-y-2 text-muted-foreground">
                  <li>• Access to your personal information</li>
                  <li>• Correction of inaccurate information</li>
                  <li>• Deletion of your personal information</li>
                  <li>• Data portability</li>
                  <li>• Objection to processing</li>
                </ul>
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