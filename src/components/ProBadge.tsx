import { Crown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ProBadgeProps {
  size?: "sm" | "default" | "lg";
  className?: string;
  showIcon?: boolean;
}

export function ProBadge({ size = "default", className, showIcon = true }: ProBadgeProps) {
  const sizeClasses = {
    sm: "text-xs px-2 py-1 font-bold",
    default: "text-sm px-3 py-1.5 font-extrabold",
    lg: "text-base px-4 py-2 font-extrabold"
  };

  const iconSizes = {
    sm: "h-3 w-3",
    default: "h-4 w-4", 
    lg: "h-5 w-5"
  };

  return (
    <Badge 
      className={cn(
        "bg-brand-secondary text-primary-foreground border border-brand-gold shadow-lg hover:shadow-xl transition-all duration-300 relative overflow-hidden",
        "hover:bg-brand-secondary/80",
        sizeClasses[size],
        className
      )}
      style={{
        background: 'hsl(var(--brand-secondary))',
        borderColor: 'hsl(var(--brand-gold))',
        color: 'hsl(var(--primary-foreground))'
      }}
    >
      {showIcon && <Crown className={cn("mr-1.5 drop-shadow-sm", iconSizes[size])} />}
      <span className="relative z-10 drop-shadow-sm tracking-wide">PRO</span>
    </Badge>
  );
}