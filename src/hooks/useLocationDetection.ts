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

  // Get location from IP (fallback method with multiple providers)
  const getLocationFromIP = async (): Promise<string | null> => {
    // Try multiple IP geolocation services for reliability
    const providers = [
      {
        url: 'https://ipapi.co/json/',
        extract: (data: any) => data.country_name
      },
      {
        url: 'https://api.ipify.org?format=json',
        extract: async (data: any) => {
          // Get country from IP using second service
          const ipResponse = await fetch(`https://freeipapi.com/api/json/${data.ip}`);
          const ipData = await ipResponse.json();
          return ipData.countryName;
        }
      },
      {
        url: 'https://api.country.is/',
        extract: (data: any) => {
          // Returns country code, need to convert to name
          const countryNames: Record<string, string> = {
            'US': 'United States', 'GB': 'United Kingdom', 'CA': 'Canada',
            'AU': 'Australia', 'DE': 'Germany', 'FR': 'France', 'IT': 'Italy',
            'ES': 'Spain', 'NL': 'Netherlands', 'SE': 'Sweden', 'NO': 'Norway',
            'DK': 'Denmark', 'FI': 'Finland', 'PL': 'Poland', 'BR': 'Brazil',
            'MX': 'Mexico', 'AR': 'Argentina', 'CL': 'Chile', 'CO': 'Colombia',
            'IN': 'India', 'CN': 'China', 'JP': 'Japan', 'KR': 'South Korea',
            'SG': 'Singapore', 'MY': 'Malaysia', 'TH': 'Thailand', 'VN': 'Vietnam',
            'PH': 'Philippines', 'ID': 'Indonesia', 'ZA': 'South Africa', 'NG': 'Nigeria',
            'EG': 'Egypt', 'KE': 'Kenya', 'AE': 'United Arab Emirates', 'SA': 'Saudi Arabia',
            'NZ': 'New Zealand', 'IE': 'Ireland', 'CH': 'Switzerland', 'AT': 'Austria',
            'BE': 'Belgium', 'PT': 'Portugal', 'GR': 'Greece', 'CZ': 'Czech Republic',
            'HU': 'Hungary', 'RO': 'Romania', 'TR': 'Turkey', 'IL': 'Israel'
          };
          return countryNames[data.country] || data.country;
        }
      }
    ];

    for (const provider of providers) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const response = await fetch(provider.url, {
          signal: controller.signal,
          headers: { 'Accept': 'application/json' }
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
          const data = await response.json();
          const country = await provider.extract(data);
          if (country) return country;
        }
      } catch (error) {
        console.log('IP provider failed, trying next:', error);
        continue;
      }
    }
    
    return null;
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
      if (hasPermission === false) {
        setState(prev => ({ ...prev, hasPermission: false, error: 'Location permission denied' }));
        resolve(null);
        return;
      }

      // More aggressive mobile-optimized geolocation options
      const options: PositionOptions = {
        timeout: 8000, // Shorter timeout for faster fallback
        enableHighAccuracy: false, // Faster response on mobile
        maximumAge: 60000 // Use 1-minute cached position
      };

      // Multiple geocoding services for reliability
      const reverseGeocode = async (lat: number, lon: number): Promise<string | null> => {
        const services = [
          {
            url: `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`,
            extract: (data: any) => data.countryName
          },
          {
            url: `https://geocode.maps.co/reverse?lat=${lat}&lon=${lon}`,
            extract: (data: any) => data.address?.country
          },
          {
            url: `https://api.opencagedata.com/geocode/v1/json?q=${lat}+${lon}&key=demo&language=en&pretty=1&no_annotations=1`,
            extract: (data: any) => data.results?.[0]?.components?.country
          }
        ];

        for (const service of services) {
          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 3000);
            
            const response = await fetch(service.url, { signal: controller.signal });
            clearTimeout(timeoutId);
            
            if (response.ok) {
              const data = await response.json();
              const country = service.extract(data);
              if (country) return country;
            }
          } catch (error) {
            console.log('Geocoding service failed, trying next');
            continue;
          }
        }
        return null;
      };

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            setState(prev => ({ ...prev, hasPermission: true, error: null }));
            const { latitude, longitude } = position.coords;
            const country = await reverseGeocode(latitude, longitude);
            resolve(country);
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
                ? 'Location access denied. Enable in: Settings > Browser > Location Services'
                : 'Location permission denied. Please enable location access in your browser.';
              setState(prev => ({ ...prev, hasPermission: false }));
              break;
            case error.POSITION_UNAVAILABLE:
              errorMsg = isMobile 
                ? 'GPS signal unavailable. Trying alternative methods...'
                : 'Location information unavailable';
              break;
            case error.TIMEOUT:
              errorMsg = 'Location request timed out. Trying alternative methods...';
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

  // Robust manual location detection - always works even if stuck
  const detectLocation = async () => {
    // Force clear any stuck state
    setState(prev => ({ ...prev, isDetecting: true, error: null }));

    let timeoutId: NodeJS.Timeout | null = null;
    let completed = false;

    try {
      // Add timeout protection (20 seconds max for mobile)
      timeoutId = setTimeout(() => {
        if (!completed) {
          setState(prev => ({ 
            ...prev, 
            isDetecting: false,
            error: 'Detection timeout. Please try again or select manually.'
          }));
          localStorage.setItem('locationDetectionFailed', 'true');
          localStorage.setItem('locationDetectionFailedTime', Date.now().toString());
        }
      }, 20000);

      let location: string | null = null;

      // Try GPS/Browser geolocation first (most accurate)
      try {
        location = await getLocationFromBrowser();
      } catch (error) {
        console.log('Browser geolocation failed, trying IP fallback');
      }
      
      // Fallback to IP-based detection if browser geolocation fails
      if (!location) {
        try {
          location = await getLocationFromIP();
        } catch (error) {
          console.log('IP detection also failed');
        }
      }

      completed = true;
      if (timeoutId) clearTimeout(timeoutId);

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
        
        // Save to database for logged-in users (non-blocking)
        if (user) {
          supabase
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
          error: 'Could not detect location. Please select your country manually from the list.'
        }));
        localStorage.setItem('locationDetectionFailed', 'true');
        localStorage.setItem('locationDetectionFailedTime', Date.now().toString());
      }
    } catch (error) {
      completed = true;
      if (timeoutId) clearTimeout(timeoutId);
      console.error('Location detection error:', error);
      setState(prev => ({ 
        ...prev, 
        isDetecting: false,
        error: 'Detection failed. Please select your location manually from the list.'
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