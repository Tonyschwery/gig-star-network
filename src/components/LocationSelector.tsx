import { useState } from 'react';
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

export const LocationSelector = () => {
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

  const handleLocationSelect = (location: string) => {
    saveLocation(location, true);
    setIsOpen(false);
  };

  const handleDetectLocation = () => {
    detectLocation();
    setIsOpen(false);
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
      <DropdownMenuContent align="end" className="w-64 max-h-80 overflow-y-auto">
        <div className="p-2">
          <p className="text-xs text-muted-foreground mb-2">
            {isDetected ? '📍 Auto-detected' : '📍 Manual selection'}
          </p>
          {isMobile && !userLocation && (
            <p className="text-xs text-accent mb-2 flex items-center gap-1">
              <Smartphone className="h-3 w-3" />
              Tap to detect location
            </p>
          )}
          {error && hasPermission === false && (
            <p className="text-xs text-destructive mb-2">
              {isMobile ? 'Enable location in browser settings' : error}
            </p>
          )}
        </div>
        
        <DropdownMenuItem onClick={handleDetectLocation} disabled={isDetecting}>
          <MapPin className="h-4 w-4 mr-2" />
          {isDetecting ? 'Detecting...' : isMobile ? 'Tap to Detect Location' : 'Detect My Location'}
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