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

  // Get location from IP (fallback method)
  const getLocationFromIP = async (): Promise<string | null> => {
    try {
      // Add timeout and abort controller to prevent hanging requests
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

      const response = await fetch('https://ipapi.co/json/', {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
        }
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      if (data.country_name) {
        return data.country_name;
      }
      return null;
    } catch (error) {
      // Silently fail to avoid console spam and performance issues
      if (error.name !== 'AbortError') {
        console.warn('Location detection from IP failed, using fallback');
      }
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

  // Detect location automatically
  const detectLocation = useCallback(async () => {
    if (state.isDetecting) return;

    setState(prev => ({ ...prev, isDetecting: true, error: null }));

    try {
      // Try browser geolocation first
      let location = await getLocationFromBrowser();
      
      // Fallback to IP-based detection
      if (!location) {
        location = await getLocationFromIP();
      }

      if (location) {
        setState(prev => ({ ...prev, detectedLocation: location }));
        
        // Save detected location to database if user is logged in
        if (user) {
          await supabase
            .from('user_preferences')
            .upsert({
              user_id: user.id,
              detected_location: location,
              preferred_location: state.userLocation
            }, { onConflict: 'user_id' });
        }

        // Use detected location if no user preference exists
        if (!state.userLocation) {
          setState(prevState => ({ ...prevState, userLocation: location }));
          localStorage.setItem('userLocation', location);
        }
      } else {
        setState(prev => ({ ...prev, error: 'Could not detect location' }));
      }
    } catch (error) {
      console.error('Location detection failed:', error);
      setState(prevState => ({ ...prevState, error: 'Location detection failed' }));
    } finally {
      setState(prevState => ({ ...prevState, isDetecting: false }));
    }
  }, [user, state.isDetecting, state.userLocation]);

  // Initialize on mount - Always try IP detection for proximity sorting
  useEffect(() => {
    // Load from localStorage first
    const savedLocation = localStorage.getItem('userLocation');
    const isOverride = localStorage.getItem('locationOverride') === 'true';
    
    if (savedLocation) {
      setState(prev => ({ ...prev, userLocation: savedLocation }));
    }

    // Load database preferences if logged in
    if (user) {
      loadUserPreferences();
    }

    // Always try IP-based detection for proximity sorting (non-intrusive)
    // But prevent multiple simultaneous calls and use cache
    if (!state.detectedLocation && !state.isDetecting) {
      const cachedLocation = sessionStorage.getItem('detectedLocation');
      const cacheTime = sessionStorage.getItem('detectedLocationTime');
      const now = Date.now();
      
      // Use cached location if it's less than 1 hour old
      if (cachedLocation && cacheTime && (now - parseInt(cacheTime)) < 3600000) {
        setState(prev => ({ ...prev, detectedLocation: cachedLocation }));
      } else {
        // Only fetch if not already detecting
        setState(prev => ({ ...prev, isDetecting: true }));
        getLocationFromIP().then(ipLocation => {
          if (ipLocation) {
            setState(prev => ({ ...prev, detectedLocation: ipLocation, isDetecting: false }));
            // Cache the result
            sessionStorage.setItem('detectedLocation', ipLocation);
            sessionStorage.setItem('detectedLocationTime', now.toString());
          } else {
            setState(prev => ({ ...prev, isDetecting: false }));
          }
        }).catch(() => {
          setState(prev => ({ ...prev, isDetecting: false }));
        });
      }
    }

    // Only auto-detect GPS on desktop and if no location is set
    // Mobile browsers require user interaction for location access
    if (!isMobile && !savedLocation && !state.detectedLocation) {
      detectLocation();
    }
  }, [user, loadUserPreferences, isMobile]);

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