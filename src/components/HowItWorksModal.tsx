import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Search, MessageCircle, Calendar } from "lucide-react";

interface HowItWorksModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function HowItWorksModal({ open, onOpenChange }: HowItWorksModalProps) {
  const steps = [
    {
      step: "01",
      icon: <Search className="h-6 w-6" />,
      title: "Find Talents",
      description: "Search by location and type to discover the perfect performers for your event."
    },
    {
      step: "02", 
      icon: <MessageCircle className="h-6 w-6" />,
      title: "Chat with them",
      description: "Direct messaging to discuss details, negotiate pricing, and plan your event."
    },
    {
      step: "03",
      icon: <Calendar className="h-6 w-6" />,
      title: "Book them online",
      description: "Secure booking through our platform with easy scheduling and coordination."
    }
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl sm:text-2xl font-bold text-center mb-2">
            How Qtalent.live Works
          </DialogTitle>
          <p className="text-muted-foreground text-center text-sm sm:text-base">
            Book talented performers in 3 simple steps
          </p>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mt-4 sm:mt-6 px-2 sm:px-0">
          {steps.map((step) => (
            <Card key={step.step} className="glass-card p-6 text-center hover:shadow-lg transition-all duration-300">
              <div className="mb-4">
                <div className="text-2xl font-bold text-accent mb-3">{step.step}</div>
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-accent/10 text-accent mb-3">
                  {step.icon}
                </div>
              </div>
              <h3 className="font-semibold text-lg mb-2">{step.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{step.description}</p>
            </Card>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}