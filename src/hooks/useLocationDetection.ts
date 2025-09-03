import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

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
      const response = await fetch('https://ipapi.co/json/');
      const data = await response.json();
      if (data.country_name) {
        return data.country_name;
      }
      return null;
    } catch (error) {
      console.error('Failed to get location from IP:', error);
      return null;
    }
  };

  // Get location from browser geolocation
  const getLocationFromBrowser = async (): Promise<string | null> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve(null);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
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
          setState(prev => ({ ...prev, hasPermission: false }));
          resolve(null);
        },
        { timeout: 10000, enableHighAccuracy: false }
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

  // Initialize on mount
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

    // Auto-detect if no location is set
    if (!savedLocation && !state.detectedLocation) {
      detectLocation();
    }
  }, [user, detectLocation, loadUserPreferences, state.detectedLocation]);

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