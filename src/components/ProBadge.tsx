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
        "bg-gradient-to-r from-brand-success to-brand-accent text-background shadow-lg hover:shadow-xl transition-all duration-300 border-2 border-brand-accent relative overflow-hidden",
        "before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent before:animate-shimmer",
        sizeClasses[size],
        className
      )}
    >
      {showIcon && <Crown className={cn("mr-1.5 drop-shadow-sm", iconSizes[size])} />}
      <span className="relative z-10 drop-shadow-sm tracking-wide">PRO</span>
    </Badge>
  );
}