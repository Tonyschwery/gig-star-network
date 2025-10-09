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
    if (state.isDetecting) {
      console.log('Location detection already in progress');
      return;
    }

    console.log('Starting location detection...');
    setState(prev => ({ ...prev, isDetecting: true, error: null }));

    try {
      // Try browser geolocation first (more accurate)
      let location = await getLocationFromBrowser();
      
      // Fallback to IP-based detection if browser geolocation fails
      if (!location) {
        console.log('Browser geolocation failed, trying IP-based detection...');
        location = await getLocationFromIP();
      }

      if (location) {
        console.log('Location detected:', location);
        
        // Update both detected and user location
        setState(prev => ({ 
          ...prev, 
          detectedLocation: location,
          userLocation: location,
          error: null
        }));
        
        // Save to localStorage immediately
        localStorage.setItem('userLocation', location);
        localStorage.setItem('locationOverride', 'true');
        
        // Save detected location to database if user is logged in
        if (user) {
          try {
            await supabase
              .from('user_preferences')
              .upsert({
                user_id: user.id,
                detected_location: location,
                preferred_location: location,
                location_override: true
              }, { onConflict: 'user_id' });
          } catch (dbError) {
            console.error('Failed to save location to database:', dbError);
          }
        }
      } else {
        console.warn('Could not detect location from any source');
        setState(prev => ({ ...prev, error: 'Could not detect location. Please select manually.' }));
      }
    } catch (error) {
      console.error('Location detection failed:', error);
      setState(prev => ({ ...prev, error: 'Location detection failed. Please select manually.' }));
    } finally {
      setState(prev => ({ ...prev, isDetecting: false }));
    }
  }, [user, state.isDetecting]);

  // Initialize on mount - Simplified and more reliable
  useEffect(() => {
    let mounted = true;
    
    const initLocation = async () => {
      // Load from localStorage first
      const savedLocation = localStorage.getItem('userLocation');
      const isOverride = localStorage.getItem('locationOverride') === 'true';
      
      if (savedLocation) {
        if (mounted) {
          setState(prev => ({ ...prev, userLocation: savedLocation }));
        }
        return; // Exit early if we have a saved location
      }

      // Load database preferences if logged in
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
            return; // Exit early if DB has location
          }
        } catch (error) {
          console.error('Failed to load location preferences:', error);
        }
      }

      // Only auto-detect if no saved location exists
      if (!savedLocation && mounted) {
        try {
          const location = await getLocationFromIP();
          if (location && mounted) {
            setState(prev => ({ 
              ...prev, 
              userLocation: location,
              detectedLocation: location 
            }));
            localStorage.setItem('userLocation', location);
            localStorage.setItem('locationOverride', 'false');
          }
        } catch (error) {
          console.error('Failed to auto-detect location:', error);
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