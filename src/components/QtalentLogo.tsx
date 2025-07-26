import { useState } from "react";

interface LogoProps {
  className?: string;
  onClick?: () => void;
}

export function QtalentLogo({ className = "", onClick }: LogoProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div 
      className={`flex items-center cursor-pointer transition-all duration-300 ${className}`}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex items-baseline">
        <span className="text-2xl font-bold text-foreground tracking-tight">
          Qtalent
        </span>
        <span className="text-2xl font-bold text-foreground tracking-tight flex items-center">
          .live
          <div 
            className={`
              ml-1 w-2 h-2 bg-live-dot rounded-full
              transition-all duration-500
              ${isHovered ? 'animate-live-pulse scale-125' : 'animate-live-glow'}
            `}
          />
        </span>
      </div>
    </div>
  );
}