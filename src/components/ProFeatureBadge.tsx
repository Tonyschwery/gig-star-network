import { Crown, Lock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ProFeatureBadgeProps {
  isPro?: boolean;
  feature: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function ProFeatureBadge({ 
  isPro = false, 
  feature, 
  className = "",
  size = "md" 
}: ProFeatureBadgeProps) {
  const sizeClasses = {
    sm: "text-xs px-2 py-0.5",
    md: "text-sm px-3 py-1", 
    lg: "text-base px-4 py-1.5"
  };

  if (isPro) {
    return (
      <Badge 
        className={cn(
          "bg-brand-secondary text-primary-foreground border border-brand-gold gap-1 hover:bg-brand-secondary/80 transition-colors",
          sizeClasses[size],
          className
        )}
        style={{
          background: 'hsl(var(--brand-secondary))',
          borderColor: 'hsl(var(--brand-gold))',
          color: 'hsl(var(--primary-foreground))'
        }}
      >
        <Crown className="h-3 w-3" style={{ color: 'hsl(var(--brand-gold))' }} />
        {feature}
      </Badge>
    );
  }

  return (
    <Badge 
      variant="outline" 
      className={cn(
        "bg-muted/50 text-muted-foreground border-muted-foreground/30 gap-1",
        sizeClasses[size],
        className
      )}
    >
      <Lock className="h-3 w-3" />
      {feature} (Pro Only)
    </Badge>
  );
}

export function ProComparisonList() {
  const features = [
    { name: "Platform Commission", free: "20%", pro: "0%" },
    { name: "Gallery Photos", free: "5 max", pro: "Unlimited" },
    { name: "Search Priority", free: "Standard", pro: "Top Results" },
    { name: "Premium Gigs", free: "Limited", pro: "Full Access" },
    { name: "Profile Badge", free: "Standard", pro: "Golden Crown" },
    { name: "Customer Support", free: "Standard", pro: "Priority" },
  ];

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-center mb-4">Free vs Pro Comparison</h3>
      <div className="grid grid-cols-1 gap-3">
        {features.map((feature, index) => (
          <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border">
            <span className="font-medium text-sm">{feature.name}</span>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-xs text-muted-foreground">Free</div>
                <div className="text-sm font-medium">{feature.free}</div>
              </div>
              <div className="text-right">
                <div className="text-xs" style={{ color: 'hsl(var(--brand-gold))' }}>Pro</div>
                <div className="text-sm font-medium" style={{ color: 'hsl(var(--brand-gold))' }}>{feature.pro}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}