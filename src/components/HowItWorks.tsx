import { Card } from "@/components/ui/card";
import { Search, MessageCircle, CreditCard } from "lucide-react";

export function HowItWorks() {
  return (
    <section className="py-24 bg-gradient-to-b from-background to-muted/20" id="how-it-works">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-4">How it works</h2>
          <p className="text-xl text-muted-foreground">
            Book talented performers in 3 simple steps
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          <StepCard
            step="01"
            icon={<Search className="h-8 w-8" />}
            title="Tell us about your event"
            description="Describe how you want your event to take place and your ideal performance. Share your budget, venue details, and specific requirements."
          />
          
          <StepCard
            step="02"
            icon={<MessageCircle className="h-8 w-8" />}
            title="Choose your talent"
            description="We'll match you with the most qualified artists. Message them to agree on the details and get the perfect price for your event."
          />
          
          <StepCard
            step="03"
            icon={<CreditCard className="h-8 w-8" />}
            title="Enjoy the performance"
            description="Once you've found the perfect artist and agreed on payment terms, finalize the booking details and enjoy your event."
          />
        </div>
      </div>
    </section>
  );
}

interface StepCardProps {
  step: string;
  icon: React.ReactNode;
  title: string;
  description: string;
}

function StepCard({ step, icon, title, description }: StepCardProps) {
  return (
    <Card className="p-8 glass-card text-center hover:shadow-elevated transition-all duration-300 group">
      <div className="mb-6">
        <div className="text-3xl font-bold text-brand-primary mb-4">{step}</div>
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-brand-primary/10 text-brand-primary group-hover:bg-brand-primary group-hover:text-white transition-all duration-300">
          {icon}
        </div>
      </div>
      
      <h3 className="text-xl font-semibold mb-4">{title}</h3>
      <p className="text-muted-foreground leading-relaxed">{description}</p>
    </Card>
  );
}