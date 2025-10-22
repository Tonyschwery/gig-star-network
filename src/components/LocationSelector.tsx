import { useState, useEffect } from "react";
import { MapPin, ChevronDown, Loader2, RefreshCw, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { useLocationDetection } from "@/hooks/useLocationDetection";
import { useIsMobile } from "@/hooks/use-mobile";
import { countries, sortCountriesByProximity } from "@/lib/countries";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface LocationSelectorProps {
  onLocationChange?: (location: string) => void;
}

export const LocationSelector = ({ onLocationChange }: LocationSelectorProps) => {
  const {
    userLocation,
    detectedLocation,
    isDetecting,
    detectionState,
    hasPermission,
    error,
    detectionAttempts,
    saveLocation,
    detectLocation,
    forceReset,
  } = useLocationDetection();

  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = useState(false);
  const [showError, setShowError] = useState(false);

  // Show/hide error message
  useEffect(() => {
    if (error) {
      setShowError(true);
    } else {
      setShowError(false);
    }
  }, [error]);

  // Notify parent when location changes
  useEffect(() => {
    // This now correctly uses the final, resolved location
    onLocationChange?.(userLocation);
  }, [userLocation, onLocationChange]);

  // --- ⬇️ THIS IS THE FIX ⬇️ ---
  // This new useEffect automatically saves the detected location as the user's
  // choice, but only if they haven't already made a manual selection.
  useEffect(() => {
    // 1. Check if detection was just successful and we found a valid location.
    if (detectionState === "success" && detectedLocation && detectedLocation !== "Worldwide") {
      // 2. Check if the user's current selection is still the default "Worldwide".
      //    This prevents overwriting a manual selection they might have made.
      if (userLocation === "Worldwide") {
        // 3. Automatically save the detected location. The 'false' indicates
        //    this is not a manual override.
        console.log(`✅ Auto-saving detected location: ${detectedLocation}`);
        saveLocation(detectedLocation, false);
      }
    }
  }, [detectionState, detectedLocation, userLocation, saveLocation]);
  // --- ⬆️ THIS IS THE FIX ⬆️ ---

  const handleLocationSelect = (location: string) => {
    // When a user clicks, it's always a manual override (true)
    saveLocation(location, true);
    setIsOpen(false);
  };

  const handleDetectLocation = async () => {
    setShowError(false);
    await detectLocation();
  };

  const handleForceReset = () => {
    forceReset();
    setShowError(false);
  };

  const isDetected = userLocation === detectedLocation && userLocation !== "Worldwide";
  const showRetryButton = detectionState === "error" && detectionAttempts > 0;

  // Sort countries by proximity to user's location
  const sortedCountries = sortCountriesByProximity(userLocation, countries);

  return (
    <div className="relative">
      {showError && error && (
        <Alert variant="destructive" className="mb-2 animate-in fade-in slide-in-from-top-2">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-xs">{error}</AlertDescription>
        </Alert>
      )}

      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            className="gap-2 bg-background/80 backdrop-blur-sm border-border/50 hover:bg-accent/80 w-full sm:w-auto"
          >
            <MapPin className={`h-4 w-4 ${isDetected ? "text-green-500" : ""}`} />
            <span className="text-sm font-medium">{userLocation}</span>
            {isDetecting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : showRetryButton ? (
              <RefreshCw className="h-4 w-4 text-destructive" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="w-72 max-h-96 overflow-y-auto bg-background/95 backdrop-blur-sm border border-border/50 shadow-lg z-50"
        >
          <div className="p-3 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                {isDetected
                  ? "✅ Auto-detected"
                  : detectionState === "error"
                    ? "❌ Detection failed"
                    : isDetecting
                      ? "⏳ Detecting..."
                      : "📍 Manual selection"}
              </p>
              {detectionAttempts > 0 && (
                <span className="text-xs text-muted-foreground">Attempt {detectionAttempts}/3</span>
              )}
            </div>

            {isDetecting && (
              <div className="text-xs text-accent flex items-center gap-2 p-2 bg-accent/10 rounded">
                <Loader2 className="h-3 w-3 animate-spin" />
                <span>Trying multiple detection methods...</span>
              </div>
            )}
          </div>

          <DropdownMenuSeparator />

          <DropdownMenuLabel className="text-xs font-medium text-muted-foreground">Quick Actions</DropdownMenuLabel>

          <DropdownMenuItem
            onClick={handleDetectLocation}
            disabled={isDetecting}
            className="cursor-pointer hover:bg-accent/50"
          >
            {isDetecting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <MapPin className="h-4 w-4 mr-2" />}
            {isDetecting
              ? "Detecting Your Location..."
              : hasPermission === false
                ? "🔄 Try GPS Again (Permission Denied)"
                : detectionState === "error"
                  ? "🔄 Retry Location Detection"
                  : isMobile
                    ? "📍 Detect My Location"
                    : "🎯 Auto-Detect Location"}
          </DropdownMenuItem>

          {showRetryButton && (
            <DropdownMenuItem onClick={handleForceReset} className="cursor-pointer hover:bg-accent/50 text-orange-600">
              <RefreshCw className="h-4 w-4 mr-2" />
              Reset & Try Again
            </DropdownMenuItem>
          )}

          <DropdownMenuItem
            onClick={() => handleLocationSelect("Worldwide")}
            className="cursor-pointer hover:bg-accent/50"
          >
            <span className="mr-2">🌍</span>
            Worldwide (Show All)
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuLabel className="text-xs font-medium text-muted-foreground">Select Manually</DropdownMenuLabel>

          {/* This part for showing a separate "detected" option is now removed,
              as the main selection will update automatically. */}

          <div className="max-h-64 overflow-y-auto">
            {sortedCountries.map((country) => (
              <DropdownMenuItem
                key={country.code}
                onClick={() => handleLocationSelect(country.name)}
                className={`cursor-pointer hover:bg-accent/50 ${userLocation === country.name ? "bg-accent font-medium" : ""}`}
              >
                <span className="mr-2">{country.flag}</span>
                {country.name}
                {userLocation === country.name && <span className="ml-auto text-xs">✓</span>}
              </DropdownMenuItem>
            ))}
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};
