import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Crown, Star, Zap, Users, MessageSquare, Calendar, Shield, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

export default function Pricing() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

  const talentPlans = [
    {
      name: "Free",
      description: "Start your talent journey",
      monthlyPrice: 0,
      yearlyPrice: 0,
      commission: "20%",
      features: [
        "Create professional profile",
        "Receive booking requests", 
        "Basic messaging with clients",
        "Standard support response",
        "1 booking request per month",
        "Up to 1 profile image",
        "Basic profile visibility"
      ],
      limitations: [
        "20% platform commission on earnings",
        "Limited access to premium gigs",
        "Standard search ranking",
        "No priority support",
        "Basic profile features only"
      ],
      buttonText: "Get Started Free",
      popular: false,
      badge: null
    },
    {
      name: "Pro",
      description: "For serious performers who want to earn more",
      monthlyPrice: 19.99,
      yearlyPrice: 179.88,
      commission: "0%",
      features: [
        "Everything in Free",
        "Zero commission - keep 100% of earnings!",
        "Priority listing in search results",
        "Access to exclusive premium gigs",
        "Priority customer support",
        "Verified Pro badge with crown",
        "Unlimited gallery photos & videos",
        "Custom booking requirements",
        "Enhanced profile features",
        "Advanced messaging tools"
      ],
      limitations: [],
      buttonText: "Upgrade to Pro",
      popular: true,
      badge: "Most Popular",
      savings: "Save $20 on every $100 earned!"
    }
  ];

  const clientFeatures = [
    {
      icon: <Users className="h-8 w-8 text-accent" />,
      title: "Verified Talent",
      description: "All performers are background-checked and verified"
    },
    {
      icon: <MessageSquare className="h-8 w-8 text-accent" />,
      title: "Direct Communication",
      description: "Chat directly with talent to discuss your event needs"
    },
    {
      icon: <Calendar className="h-8 w-8 text-accent" />,
      title: "Easy Booking",
      description: "Simple booking process with secure payment handling"
    },
    {
      icon: <Shield className="h-8 w-8 text-accent" />,
      title: "Payment Protection",
      description: "Secure payments with buyer protection guarantee"
    }
  ];

  const handleGetStarted = (planName: string) => {
    if (!user) {
      navigate('/auth');
      return;
    }
    
    if (planName === 'Free') {
      navigate('/talent-dashboard');
    } else {
      // Navigate to talent dashboard where the subscription button will handle the payment flow
      navigate('/talent-dashboard');
    }
  };

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
          Choose Your <span className="text-accent">Plan</span>
        </h1>
        <p className="text-subhead max-w-3xl mx-auto mb-8">
          Whether you're booking talent or showcasing your skills, we have the perfect plan for you.
        </p>
      </section>

      {/* For Talent Section */}
      <section id="upgrade-to-pro" className="container mx-auto px-4 mb-20">
        <div className="text-center mb-12">
          <h2 className="text-headline mb-4">For Talent</h2>
          <p className="text-subhead mb-8">Join thousands of performers earning with Qtalent.live</p>
          
          {/* Billing Toggle */}
          <div className="inline-flex items-center bg-secondary rounded-lg p-1 mb-8">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-4 py-2 rounded-md font-medium transition-all ${
                billingCycle === 'monthly' 
                  ? 'bg-accent text-accent-foreground' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle('yearly')}
              className={`px-4 py-2 rounded-md font-medium transition-all ${
                billingCycle === 'yearly' 
                  ? 'bg-accent text-accent-foreground' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Yearly
              <Badge variant="secondary" className="ml-2">Save 17%</Badge>
            </button>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4 md:gap-8 max-w-4xl mx-auto px-2">
          {talentPlans.map((plan, index) => (
            <Card 
              key={plan.name} 
              className={`relative glass-card ${
                plan.popular ? 'border-accent shadow-live' : ''
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-accent text-accent-foreground text-xs">
                    <Crown className="h-3 w-3 mr-1" />
                    Most Popular
                  </Badge>
                </div>
              )}
              
              <CardHeader className="text-center pb-4 md:pb-8 px-4 md:px-6">
                <CardTitle className="text-xl md:text-2xl flex items-center justify-center gap-2">
                  {plan.name}
                  {plan.name === 'Pro' && <Crown className="h-5 w-5 text-brand-warning" />}
                </CardTitle>
                <CardDescription className="text-sm md:text-base">{plan.description}</CardDescription>
                
                <div className="mt-3 md:mt-4">
                  <div className="text-3xl md:text-4xl font-bold">
                    ${billingCycle === 'monthly' ? plan.monthlyPrice : plan.yearlyPrice}
                    <span className="text-base md:text-lg font-normal text-muted-foreground">
                      /{billingCycle === 'monthly' ? 'month' : 'year'}
                    </span>
                  </div>
                  <div className={`text-xs md:text-sm font-semibold mt-2 ${
                    plan.name === 'Pro' ? 'text-brand-success' : 'text-muted-foreground'
                  }`}>
                    {plan.commission} platform commission
                    {plan.name === 'Pro' && <span className="block text-xs text-brand-success mt-1">Keep 100% of your earnings!</span>}
                  </div>
                  {plan.savings && (
                    <div className="text-xs text-brand-success font-medium mt-2 bg-brand-success/10 rounded-full px-3 py-1">
                      {plan.savings}
                    </div>
                  )}
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4 md:space-y-6 px-4 md:px-6 pb-4 md:pb-6">
                <div className="space-y-2 md:space-y-3">
                  {plan.features.map((feature, idx) => (
                    <div key={idx} className="flex items-start space-x-2 md:space-x-3">
                      <Check className="h-4 w-4 md:h-5 md:w-5 text-accent flex-shrink-0 mt-0.5" />
                      <span className="text-xs md:text-sm">{feature}</span>
                    </div>
                  ))}
                </div>
                
                <Button 
                  className={`w-full text-sm md:text-base py-2 md:py-3 ${plan.popular ? 'hero-button' : 'outline-button'}`}
                  onClick={() => handleGetStarted(plan.name)}
                >
                  {plan.buttonText}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* For Clients Section */}
      <section className="bg-secondary/30 py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-headline mb-4">For Event Organizers</h2>
            <p className="text-subhead mb-8">Booking talent is completely free for clients</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
            {clientFeatures.map((feature, index) => (
              <Card key={index} className="glass-card text-center">
                <CardContent className="pt-6">
                  <div className="flex justify-center mb-4">
                    {feature.icon}
                  </div>
                  <h3 className="font-semibold mb-2">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="glass-card max-w-2xl mx-auto">
            <CardContent className="text-center py-12">
              <h3 className="text-2xl font-bold mb-4">Free for Event Organizers</h3>
              <p className="text-muted-foreground mb-6">
                Browse, connect, and book talent at no cost. You only pay the agreed price to the performer.
              </p>
              <Button 
                className="hero-button"
                onClick={() => navigate('/your-event')}
              >
                Start Booking Now
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="text-center mb-12">
          <h2 className="text-headline mb-4">Frequently Asked Questions</h2>
        </div>

        <div className="max-w-3xl mx-auto space-y-6">
          <Card className="glass-card">
            <CardContent className="pt-6">
              <h3 className="font-semibold mb-2">How much money will I save with Pro?</h3>
              <p className="text-muted-foreground">
                Pro users pay 0% commission vs 20% for free users. This means you save $20 on every $100 you earn! For a $500 gig, you'd save $100 with Pro.
              </p>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardContent className="pt-6">
              <h3 className="font-semibold mb-2">What's included in Pro membership?</h3>
              <p className="text-muted-foreground">
                Pro members get zero commission (0% vs 20%), golden crown badge, priority in search results, access to exclusive premium gigs, unlimited gallery photos, and priority customer support.
              </p>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardContent className="pt-6">
              <h3 className="font-semibold mb-2">How do payments work?</h3>
              <p className="text-muted-foreground">
                Clients pay the agreed amount directly to you through our secure payment system. We process payments and take our commission automatically, so you receive your earnings minus the commission fee.
              </p>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardContent className="pt-6">
              <h3 className="font-semibold mb-2">Can I cancel my Pro subscription?</h3>
              <p className="text-muted-foreground">
                Yes, you can cancel anytime through your dashboard. You'll continue to have Pro benefits until the end of your billing period, then revert to the free plan.
              </p>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardContent className="pt-6">
              <h3 className="font-semibold mb-2">Is there a setup fee for clients?</h3>
              <p className="text-muted-foreground">
                No, creating an account and booking talent is completely free for event organizers and clients. They only pay the agreed performance fee.
              </p>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardContent className="pt-6">
              <h3 className="font-semibold mb-2">What are premium gigs?</h3>
              <p className="text-muted-foreground">
                Premium gigs are exclusive, high-paying opportunities from corporate clients, luxury events, and premium venues that are only available to Pro subscribers.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}