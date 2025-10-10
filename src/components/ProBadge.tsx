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
        // Premium gold gradient with beveled edge effect
        "bg-gradient-to-br from-yellow-400 via-amber-500 to-yellow-600",
        "text-white border-2 border-yellow-300/50",
        // 3D beveled effect with multiple shadows
        "shadow-[0_2px_0_rgb(180,83,9),0_4px_8px_rgba(234,179,8,0.4),inset_0_1px_0_rgba(255,255,255,0.3),inset_0_-2px_0_rgba(180,83,9,0.3)]",
        "hover:shadow-[0_3px_0_rgb(180,83,9),0_6px_12px_rgba(234,179,8,0.5),inset_0_1px_0_rgba(255,255,255,0.4),inset_0_-2px_0_rgba(180,83,9,0.4)]",
        // Subtle animation and transform
        "transition-all duration-300 relative overflow-hidden",
        "hover:translate-y-[-1px] active:translate-y-[1px]",
        // Shine effect overlay
        "before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent",
        "before:-translate-x-full hover:before:translate-x-full before:transition-transform before:duration-700",
        sizeClasses[size],
        className
      )}
    >
      {showIcon && (
        <Crown 
          className={cn(
            "mr-1.5 drop-shadow-[0_1px_2px_rgba(180,83,9,0.8)]", 
            iconSizes[size]
          )} 
        />
      )}
      <span className="relative z-10 drop-shadow-[0_1px_2px_rgba(180,83,9,0.8)] tracking-wide font-black">
        PRO
      </span>
    </Badge>
  );
}