import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useIsMobile } from '@/hooks/use-mobile';

interface LocationData {
  country: string;
  countryCode: string;
  city?: string;
}

interface LocationState {
  userLocation: string | null;
  detectedLocation: string | null;
  isDetecting: boolean;
  hasPermission: boolean | null;
  error: string | null;
}

export const useLocationDetection = () => {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [state, setState] = useState<LocationState>({
    userLocation: null,
    detectedLocation: null,
    isDetecting: false,
    hasPermission: null,
    error: null
  });

  // Get location from IP (fallback method) - silently fails, manual selection always available
  const getLocationFromIP = async (): Promise<string | null> => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout

      const response = await fetch('https://ipapi.co/json/', {
        signal: controller.signal,
        headers: { 'Accept': 'application/json' }
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) return null;
      
      const data = await response.json();
      return data.country_name || null;
    } catch (error) {
      // Silently fail - manual selection is always available
      return null;
    }
  };

  // Enhanced permission checking for mobile browsers
  const requestLocationPermission = async (): Promise<boolean> => {
    if (!navigator.permissions) return true;
    
    try {
      const permission = await navigator.permissions.query({ name: 'geolocation' });
      setState(prev => ({ 
        ...prev, 
        hasPermission: permission.state === 'granted' ? true : permission.state === 'denied' ? false : null 
      }));
      return permission.state !== 'denied';
    } catch {
      return true;
    }
  };

  // Get location from browser geolocation with mobile-specific handling
  const getLocationFromBrowser = async (): Promise<string | null> => {
    return new Promise(async (resolve) => {
      if (!navigator.geolocation) {
        resolve(null);
        return;
      }

      // Check permission first, especially important on mobile
      const hasPermission = await requestLocationPermission();
      if (!hasPermission) {
        setState(prev => ({ ...prev, hasPermission: false, error: 'Location permission denied' }));
        resolve(null);
        return;
      }

      // Mobile-optimized geolocation options
      const options = {
        timeout: isMobile ? 10000 : 15000,
        enableHighAccuracy: false,
        maximumAge: isMobile ? 300000 : 60000 // 5 min cache on mobile, 1 min on desktop
      };

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            setState(prev => ({ ...prev, hasPermission: true }));
            const { latitude, longitude } = position.coords;
            const response = await fetch(
              `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
            );
            const data = await response.json();
            resolve(data.countryName || null);
          } catch (error) {
            console.error('Failed to reverse geocode:', error);
            resolve(null);
          }
        },
        (error) => {
          console.error('Geolocation error:', error);
          let errorMsg = 'Location detection failed';
          
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMsg = isMobile 
                ? 'Location access denied. To enable: Settings > Safari > Location Services > Safari Websites > Allow'
                : 'Location permission denied. Please enable location access in your browser settings.';
              setState(prev => ({ ...prev, hasPermission: false }));
              break;
            case error.POSITION_UNAVAILABLE:
              errorMsg = 'Location information unavailable';
              break;
            case error.TIMEOUT:
              errorMsg = isMobile ? 'Location request timed out. Please try again.' : 'Location request timed out';
              break;
          }
          
          setState(prev => ({ ...prev, error: errorMsg }));
          resolve(null);
        },
        options
      );
    });
  };

  // Load user preferences from database
  const loadUserPreferences = useCallback(async () => {
    if (!user) return;

    try {
      const { data } = await supabase
        .from('user_preferences')
        .select('preferred_location, detected_location, location_override')
        .eq('user_id', user.id)
        .maybeSingle();

      if (data) {
        const userLoc = data.location_override 
          ? data.preferred_location 
          : data.preferred_location || data.detected_location;
        
        setState(prev => ({
          ...prev,
          userLocation: userLoc,
          detectedLocation: data.detected_location
        }));
      }
    } catch (error) {
      console.error('Failed to load user preferences:', error);
    }
  }, [user]);

  // Save location to database and localStorage
  const saveLocation = async (location: string, isOverride = false) => {
    // Save to localStorage for immediate use
    localStorage.setItem('userLocation', location);
    localStorage.setItem('locationOverride', isOverride.toString());
    localStorage.setItem('locationDetectionTime', Date.now().toString());

    setState(prev => ({ ...prev, userLocation: location }));

    // Save to database if user is logged in
    if (user) {
      try {
        await supabase
          .from('user_preferences')
          .upsert({
            user_id: user.id,
            preferred_location: location,
            detected_location: state.detectedLocation,
            location_override: isOverride
          }, { onConflict: 'user_id' });
      } catch (error) {
        console.error('Failed to save location preference:', error);
      }
    }
  };

  // Detect location automatically - never blocks manual selection
  const detectLocation = async () => {
    if (state.isDetecting) return;

    setState(prev => ({ ...prev, isDetecting: true, error: null }));

    // Add timeout protection (15 seconds max)
    const timeoutId = setTimeout(() => {
      setState(prev => ({ 
        ...prev, 
        isDetecting: false,
        error: 'Detection timeout. Please select your location manually.'
      }));
      localStorage.setItem('locationDetectionFailed', 'true');
      localStorage.setItem('locationDetectionFailedTime', Date.now().toString());
    }, 15000);

    try {
      // Try browser geolocation first (more accurate)
      let location = await getLocationFromBrowser();
      
      // Fallback to IP-based detection if browser geolocation fails
      if (!location) {
        location = await getLocationFromIP();
      }

      clearTimeout(timeoutId);

      if (location) {
        setState(prev => ({ 
          ...prev, 
          detectedLocation: location,
          userLocation: location,
          error: null,
          isDetecting: false
        }));
        
        localStorage.setItem('userLocation', location);
        localStorage.setItem('locationOverride', 'true');
        localStorage.setItem('locationDetectionTime', Date.now().toString());
        localStorage.removeItem('locationDetectionFailed');
        localStorage.removeItem('locationDetectionFailedTime');
        
        if (user) {
          await supabase
            .from('user_preferences')
            .upsert({
              user_id: user.id,
              detected_location: location,
              preferred_location: location,
              location_override: true
            }, { onConflict: 'user_id' })
            .then(() => {}, () => {}); // Ignore errors
        }
      } else {
        setState(prev => ({ 
          ...prev, 
          isDetecting: false,
          error: 'Could not detect location. Please select manually.'
        }));
        localStorage.setItem('locationDetectionFailed', 'true');
        localStorage.setItem('locationDetectionFailedTime', Date.now().toString());
      }
    } catch (error) {
      clearTimeout(timeoutId);
      console.error('Location detection error:', error);
      setState(prev => ({ 
        ...prev, 
        isDetecting: false,
        error: 'Location detection failed. Please select your location manually.'
      }));
      localStorage.setItem('locationDetectionFailed', 'true');
      localStorage.setItem('locationDetectionFailedTime', Date.now().toString());
    }
  };

  // Initialize on mount - Auto-detect with retry logic
  useEffect(() => {
    let mounted = true;
    
    const initLocation = async () => {
      const savedLocation = localStorage.getItem('userLocation');
      const isOverride = localStorage.getItem('locationOverride') === 'true';
      const lastDetectionTime = localStorage.getItem('locationDetectionTime');
      const detectionFailed = localStorage.getItem('locationDetectionFailed') === 'true';
      const failedTime = localStorage.getItem('locationDetectionFailedTime');
      
      // Check if cached location is stale (older than 24 hours)
      const isCacheStale = !lastDetectionTime || 
        (Date.now() - parseInt(lastDetectionTime)) > 24 * 60 * 60 * 1000;
      
      // Check if we should retry failed detection (after 5 minutes)
      const shouldRetryFailed = detectionFailed && failedTime &&
        (Date.now() - parseInt(failedTime)) > 5 * 60 * 1000;

      // For authenticated users, load from database
      if (user) {
        try {
          const { data } = await supabase
            .from('user_preferences')
            .select('preferred_location, location_override')
            .eq('user_id', user.id)
            .maybeSingle();

          if (data?.preferred_location && mounted) {
            setState(prev => ({ ...prev, userLocation: data.preferred_location }));
            localStorage.setItem('userLocation', data.preferred_location);
            localStorage.setItem('locationOverride', data.location_override?.toString() || 'false');
            return; // Authenticated users rely on database
          }
        } catch (error) {
          console.error('Failed to load location preferences:', error);
        }
      }

      // For non-authenticated users: use cached location but refresh if stale
      if (savedLocation && !user && !shouldRetryFailed) {
        if (mounted) {
          setState(prev => ({ ...prev, userLocation: savedLocation }));
        }
        
        // If cache is stale, refresh in background
        if (isCacheStale) {
          try {
            const location = await getLocationFromIP();
            if (location && mounted) {
              setState(prev => ({ 
                ...prev, 
                userLocation: location,
                detectedLocation: location 
              }));
              localStorage.setItem('userLocation', location);
              localStorage.setItem('locationDetectionTime', Date.now().toString());
              localStorage.setItem('locationOverride', 'false');
              localStorage.removeItem('locationDetectionFailed');
              localStorage.removeItem('locationDetectionFailedTime');
            }
          } catch (error) {
            console.error('Failed to refresh location:', error);
          }
        }
        return;
      }

      // No saved location OR should retry: auto-detect
      if ((!savedLocation || shouldRetryFailed) && mounted) {
        try {
          const location = await getLocationFromIP();
          if (location && mounted) {
            setState(prev => ({ 
              ...prev, 
              userLocation: location,
              detectedLocation: location 
            }));
            localStorage.setItem('userLocation', location);
            localStorage.setItem('locationDetectionTime', Date.now().toString());
            localStorage.setItem('locationOverride', 'false');
            localStorage.removeItem('locationDetectionFailed');
            localStorage.removeItem('locationDetectionFailedTime');
          } else if (mounted) {
            setState(prev => ({ 
              ...prev, 
              error: 'Could not detect location. Please select manually.' 
            }));
            localStorage.setItem('locationDetectionFailed', 'true');
            localStorage.setItem('locationDetectionFailedTime', Date.now().toString());
          }
        } catch (error) {
          console.error('Failed to auto-detect location:', error);
          if (mounted) {
            setState(prev => ({ 
              ...prev, 
              error: 'Location detection failed. Please select manually.' 
            }));
            localStorage.setItem('locationDetectionFailed', 'true');
            localStorage.setItem('locationDetectionFailedTime', Date.now().toString());
          }
        }
      }
    };

    initLocation();

    return () => {
      mounted = false;
    };
  }, [user]);

  return {
    userLocation: state.userLocation,
    detectedLocation: state.detectedLocation,
    isDetecting: state.isDetecting,
    hasPermission: state.hasPermission,
    error: state.error,
    detectLocation,
    saveLocation
  };
};