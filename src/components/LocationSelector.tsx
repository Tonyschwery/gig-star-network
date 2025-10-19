import { useState, useEffect } from 'react';
import { MapPin, ChevronDown, Loader2, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useLocationDetection } from '@/hooks/useLocationDetection';
import { useIsMobile } from '@/hooks/use-mobile';
import { countries, sortCountriesByProximity } from '@/lib/countries';

interface LocationSelectorProps {
  onLocationChange?: (location: string) => void;
}

export const LocationSelector = ({ onLocationChange }: LocationSelectorProps) => {
  const { 
    userLocation, 
    detectedLocation, 
    isDetecting, 
    hasPermission,
    error,
    saveLocation, 
    detectLocation 
  } = useLocationDetection();
  
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = useState(false);

  // Notify parent when location changes
  useEffect(() => {
    const currentLocation = userLocation || detectedLocation;
    if (currentLocation && currentLocation !== 'Worldwide') {
      onLocationChange?.(currentLocation);
    }
  }, [userLocation, detectedLocation, onLocationChange]);

  const handleLocationSelect = (location: string) => {
    saveLocation(location, true);
    onLocationChange?.(location);
    setIsOpen(false);
  };

  const handleDetectLocation = async () => {
    await detectLocation();
  };

  const currentLocation = userLocation || detectedLocation || 'Worldwide';
  const isDetected = userLocation === detectedLocation;
  
  // Sort countries by proximity to user's location
  const sortedCountries = sortCountriesByProximity(detectedLocation || userLocation, countries);

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          className="gap-2 bg-background/80 backdrop-blur-sm border-border/50 hover:bg-accent/80"
        >
          <MapPin className="h-4 w-4" />
          <span className="text-sm font-medium">{currentLocation}</span>
          {isDetecting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64 max-h-80 overflow-y-auto bg-background/95 backdrop-blur-sm border border-border/50">
        <div className="p-2">
          <p className="text-xs text-muted-foreground mb-2">
            {isDetected ? '📍 Auto-detected' : '📍 Manual selection'}
          </p>
          {error && (
            <div className="text-xs text-destructive mb-2 p-2 bg-destructive/10 rounded">
              {error}
            </div>
          )}
          {isMobile && !userLocation && !error && (
            <p className="text-xs text-accent mb-2 flex items-center gap-1">
              <Smartphone className="h-3 w-3" />
              Tap to detect or select manually
            </p>
          )}
        </div>
        
        <DropdownMenuItem onClick={handleDetectLocation} disabled={isDetecting}>
          <MapPin className="h-4 w-4 mr-2" />
          {isDetecting ? 'Detecting...' : error ? 'Try Again' : isMobile ? 'Tap to Detect' : 'Detect My Location'}
        </DropdownMenuItem>
        
        <DropdownMenuItem onClick={() => handleLocationSelect('Worldwide')}>
          <span className="mr-2">🌍</span>
          Worldwide
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        {detectedLocation && detectedLocation !== userLocation && (
          <>
            <DropdownMenuItem onClick={() => handleLocationSelect(detectedLocation)}>
              <span className="mr-2">📍</span>
              {detectedLocation} (detected)
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}
        
        <div className="max-h-48 overflow-y-auto">
          {sortedCountries.map((country) => (
            <DropdownMenuItem
              key={country.code}
              onClick={() => handleLocationSelect(country.name)}
              className={userLocation === country.name ? 'bg-accent' : ''}
            >
              <span className="mr-2">{country.flag}</span>
              {country.name}
            </DropdownMenuItem>
          ))}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};