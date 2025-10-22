import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface LocationData {
  country: string;
  countryCode: string;
  city?: string;
}

type DetectionState = 'idle' | 'detecting' | 'success' | 'error';

interface LocationState {
  userLocation: string | null;
  detectedLocation: string | null;
  isDetecting: boolean;
  detectionState: DetectionState;
  hasPermission: boolean | null;
  error: string | null;
  detectionAttempts: number;
  lastAttemptTime: number | null;
}

const CACHE_KEY = 'qtalent_user_location';
const CACHE_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours
const MAX_DETECTION_ATTEMPTS = 3;

export const useLocationDetection = () => {
  const { toast } = useToast();
  const [state, setState] = useState<LocationState>({
    userLocation: null,
    detectedLocation: null,
    isDetecting: false,
    detectionState: 'idle',
    hasPermission: null,
    error: null,
    detectionAttempts: 0,
    lastAttemptTime: null,
  });

  // AbortController for cleanup
  const [abortController, setAbortController] = useState<AbortController | null>(null);

  // Force reset function to clear stuck states
  const forceReset = useCallback(() => {
    console.log('🔄 Force resetting location detection state');
    if (abortController) {
      abortController.abort();
    }
    setState(prev => ({
      ...prev,
      isDetecting: false,
      detectionState: 'idle',
      error: null,
      detectionAttempts: 0,
    }));
  }, [abortController]);

  // Server-side detection via edge function (ultimate fallback)
  const detectFromEdgeFunction = async (): Promise<LocationData | null> => {
    try {
      console.log('🌐 Attempting server-side detection via edge function...');
      const { data, error } = await supabase.functions.invoke('detect-location', {
        body: {},
      });

      if (error) {
        console.error('Edge function error:', error);
        return null;
      }

      if (data && data.success && data.country) {
        console.log('✅ Server-side detection successful:', data.country);
        return {
          country: data.country,
          countryCode: data.countryCode,
          city: data.city,
        };
      }
    } catch (error) {
      console.error('Edge function exception:', error);
    }
    return null;
  };

  // Browser-based geolocation
  const getLocationFromBrowser = async (signal: AbortSignal): Promise<LocationData | null> => {
    console.log('📍 Attempting browser geolocation...');
    
    if (!navigator.geolocation) {
      console.warn('Browser geolocation not supported');
      return null;
    }

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          reject(new Error('Geolocation timeout'));
        }, 8000);

        navigator.geolocation.getCurrentPosition(
          (pos) => {
            clearTimeout(timeoutId);
            resolve(pos);
          },
          (err) => {
            clearTimeout(timeoutId);
            reject(err);
          },
          {
            enableHighAccuracy: false, // Faster response
            timeout: 7000,
            maximumAge: 60000, // 1 minute cache
          }
        );

        // Handle abort signal
        signal.addEventListener('abort', () => {
          clearTimeout(timeoutId);
          reject(new Error('Aborted'));
        });
      });

      const { latitude, longitude } = position.coords;
      console.log(`📍 Got coordinates: ${latitude}, ${longitude}`);

      // Try multiple reverse geocoding services
      const geocoders = [
        async () => {
          const response = await fetch(
            `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`,
            { signal }
          );
          const data = await response.json();
          return data.countryName;
        },
        async () => {
          const response = await fetch(
            `https://geocode.maps.co/reverse?lat=${latitude}&lon=${longitude}`,
            { signal }
          );
          const data = await response.json();
          return data.address?.country;
        },
      ];

      for (const geocoder of geocoders) {
        try {
          const country = await geocoder();
          if (country) {
            console.log('✅ Browser geolocation successful:', country);
            setState(prev => ({ ...prev, hasPermission: true }));
            return { country, countryCode: '' };
          }
        } catch (err) {
          console.warn('Geocoder failed:', err);
        }
      }
    } catch (error: any) {
      console.error('Browser geolocation error:', error);
      if (error.code === 1) {
        setState(prev => ({ ...prev, hasPermission: false }));
      }
    }

    return null;
  };

  // Client-side IP detection
  const getLocationFromIP = async (signal: AbortSignal): Promise<LocationData | null> => {
    console.log('🌐 Attempting client-side IP detection...');
    
    const ipProviders = [
      async () => {
        // Try ipwho.is without specifying IP (uses client's IP)
        const response = await fetch('https://ipwho.is/', { signal });
        const data = await response.json();
        if (data.success && data.country) {
          return { country: data.country, countryCode: data.country_code, city: data.city };
        }
        return null;
      },
      async () => {
        const response = await fetch('https://ipapi.co/json/', { signal });
        const data = await response.json();
        if (data.country_name && !data.error) {
          return { country: data.country_name, countryCode: data.country_code, city: data.city };
        }
        return null;
      },
      async () => {
        // Get IP first, then location
        const ipResponse = await fetch('https://api.ipify.org?format=json', { signal });
        const ipData = await ipResponse.json();
        const locationResponse = await fetch(`https://freeipapi.com/api/json/${ipData.ip}`, { signal });
        const data = await locationResponse.json();
        if (data.countryName) {
          return { country: data.countryName, countryCode: data.countryCode, city: data.cityName };
        }
        return null;
      },
    ];

    for (const provider of ipProviders) {
      try {
        const result = await provider();
        if (result) {
          console.log('✅ IP detection successful:', result.country);
          return result;
        }
      } catch (error) {
        console.warn('IP provider failed:', error);
      }
    }

    return null;
  };

  // Main detection function with retry logic
  const detectLocation = useCallback(async (): Promise<void> => {
    console.log('🚀 Starting location detection...');

    // Prevent too many rapid attempts
    if (state.detectionAttempts >= MAX_DETECTION_ATTEMPTS) {
      const timeSinceLastAttempt = state.lastAttemptTime ? Date.now() - state.lastAttemptTime : Infinity;
      if (timeSinceLastAttempt < 30000) { // 30 seconds cooldown
        console.warn('⚠️ Too many detection attempts, please wait');
        toast({
          title: "Please wait",
          description: "Too many attempts. Please wait 30 seconds and try again.",
          variant: "destructive",
        });
        return;
      }
      // Reset attempts after cooldown
      setState(prev => ({ ...prev, detectionAttempts: 0 }));
    }

    // Create new abort controller
    const controller = new AbortController();
    setAbortController(controller);

    // Update state to detecting
    setState(prev => ({
      ...prev,
      isDetecting: true,
      detectionState: 'detecting',
      error: null,
      detectionAttempts: prev.detectionAttempts + 1,
      lastAttemptTime: Date.now(),
    }));

    try {
      let detectedData: LocationData | null = null;

      // Try browser geolocation first (most accurate)
      detectedData = await getLocationFromBrowser(controller.signal);

      // Fallback to client-side IP detection
      if (!detectedData) {
        detectedData = await getLocationFromIP(controller.signal);
      }

      // Ultimate fallback: server-side edge function
      if (!detectedData) {
        detectedData = await detectFromEdgeFunction();
      }

      // Handle result
      if (detectedData && detectedData.country && detectedData.country !== 'Worldwide') {
        console.log('✅ Location detected successfully:', detectedData.country);
        
        // Cache the result
        const cacheData = {
          location: detectedData.country,
          timestamp: Date.now(),
        };
        localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));

        // Save to Supabase if user is authenticated
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase
            .from('user_preferences')
            .upsert({
              user_id: user.id,
              detected_location: detectedData.country,
              location_override: false,
            });
        }

        setState(prev => ({
          ...prev,
          detectedLocation: detectedData.country,
          userLocation: prev.userLocation || detectedData.country,
          isDetecting: false,
          detectionState: 'success',
          error: null,
        }));

        toast({
          title: "Location detected",
          description: `Your location: ${detectedData.country}`,
        });
      } else {
        throw new Error('All detection methods failed');
      }
    } catch (error: any) {
      console.error('❌ Location detection failed:', error);
      
      if (error.name === 'AbortError') {
        console.log('Detection aborted');
        return;
      }

      const errorMessage = state.hasPermission === false
        ? 'Location permission denied. Please enable location access in your browser settings or select your location manually.'
        : 'Unable to detect location. Please select your location manually from the dropdown.';

      setState(prev => ({
        ...prev,
        isDetecting: false,
        detectionState: 'error',
        error: errorMessage,
        detectedLocation: prev.detectedLocation || 'Worldwide',
      }));

      toast({
        title: "Location detection failed",
        description: errorMessage,
        variant: "destructive",
      });
    }
  }, [state.detectionAttempts, state.lastAttemptTime, state.hasPermission, toast]);

  // Save location (manual selection or confirmation)
  const saveLocation = useCallback(async (location: string, isManual: boolean = false) => {
    console.log(`💾 Saving location: ${location} (manual: ${isManual})`);
    
    setState(prev => ({
      ...prev,
      userLocation: location,
      detectedLocation: isManual ? prev.detectedLocation : location,
      detectionState: 'success',
      error: null,
    }));

    // Cache the selection
    const cacheData = {
      location,
      timestamp: Date.now(),
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));

    // Save to Supabase if user is authenticated
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('user_preferences')
          .upsert({
            user_id: user.id,
            preferred_location: location,
            location_override: isManual,
            detected_location: state.detectedLocation,
          });
      }
    } catch (error) {
      console.error('Error saving location preference:', error);
    }
  }, [state.detectedLocation]);

  // Load cached/saved location on mount
  useEffect(() => {
    const loadSavedLocation = async () => {
      // Check localStorage cache first
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        try {
          const { location, timestamp } = JSON.parse(cached);
          const age = Date.now() - timestamp;
          
          if (age < CACHE_EXPIRY) {
            console.log('✅ Using cached location:', location);
            setState(prev => ({
              ...prev,
              userLocation: location,
              detectedLocation: location,
              detectionState: 'success',
            }));
            return; // Don't auto-detect if we have valid cache
          }
        } catch (error) {
          console.error('Error parsing cached location:', error);
        }
      }

      // Check Supabase for authenticated users
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data } = await supabase
            .from('user_preferences')
            .select('preferred_location, detected_location, location_override')
            .eq('user_id', user.id)
            .single();

          if (data) {
            const location = data.location_override 
              ? data.preferred_location 
              : (data.preferred_location || data.detected_location);
            
            if (location) {
              console.log('✅ Using saved location from database:', location);
              setState(prev => ({
                ...prev,
                userLocation: location,
                detectedLocation: data.detected_location,
                detectionState: 'success',
              }));
              return; // Don't auto-detect if we have saved preference
            }
          }
        }
      } catch (error) {
        console.error('Error loading user preferences:', error);
      }

      // No cached location, attempt auto-detection
      console.log('No cached location found, attempting auto-detection...');
      detectLocation();
    };

    loadSavedLocation();
  }, []); // Only run once on mount

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortController) {
        abortController.abort();
      }
    };
  }, [abortController]);

  return {
    userLocation: state.userLocation || 'Worldwide',
    detectedLocation: state.detectedLocation || 'Worldwide',
    isDetecting: state.isDetecting,
    detectionState: state.detectionState,
    hasPermission: state.hasPermission || false,
    error: state.error || '',
    detectionAttempts: state.detectionAttempts,
    detectLocation,
    saveLocation,
    forceReset,
  };
};
