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
    sm: "text-xs px-1.5 py-0.5",
    default: "text-xs px-2 py-1",
    lg: "text-sm px-3 py-1.5"
  };

  const iconSizes = {
    sm: "h-2.5 w-2.5",
    default: "h-3 w-3", 
    lg: "h-4 w-4"
  };

  return (
    <Badge 
      className={cn(
        "bg-gradient-to-r from-brand-warning to-yellow-500 text-white font-bold border-0 shadow-md hover:shadow-lg transition-all duration-300 animate-pulse-subtle",
        sizeClasses[size],
        className
      )}
    >
      {showIcon && <Crown className={cn("mr-1", iconSizes[size])} />}
      PRO
    </Badge>
  );
}