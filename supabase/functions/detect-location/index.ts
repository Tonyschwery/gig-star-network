import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface LocationResponse {
  country: string;
  countryCode: string;
  city?: string;
  success: boolean;
  provider?: string;
  error?: string;
}

// Multiple IP geolocation providers for fallback
async function detectFromIPAPI(): Promise<LocationResponse | null> {
  try {
    const response = await fetch('https://ipapi.co/json/', {
      signal: AbortSignal.timeout(5000),
    });
    
    if (!response.ok) throw new Error('ipapi.co failed');
    
    const data = await response.json();
    if (data.country_name && data.country_code) {
      return {
        country: data.country_name,
        countryCode: data.country_code,
        city: data.city,
        success: true,
        provider: 'ipapi.co',
      };
    }
  } catch (error) {
    console.error('ipapi.co error:', error);
  }
  return null;
}

async function detectFromIPify(): Promise<LocationResponse | null> {
  try {
    const ipResponse = await fetch('https://api.ipify.org?format=json', {
      signal: AbortSignal.timeout(5000),
    });
    
    if (!ipResponse.ok) throw new Error('ipify failed');
    
    const ipData = await ipResponse.json();
    const ip = ipData.ip;
    
    const locationResponse = await fetch(`https://freeipapi.com/api/json/${ip}`, {
      signal: AbortSignal.timeout(5000),
    });
    
    if (!locationResponse.ok) throw new Error('freeipapi failed');
    
    const data = await locationResponse.json();
    if (data.countryName && data.countryCode) {
      return {
        country: data.countryName,
        countryCode: data.countryCode,
        city: data.cityName,
        success: true,
        provider: 'freeipapi.com',
      };
    }
  } catch (error) {
    console.error('ipify + freeipapi error:', error);
  }
  return null;
}

async function detectFromCountryIS(): Promise<LocationResponse | null> {
  try {
    const response = await fetch('https://api.country.is/', {
      signal: AbortSignal.timeout(5000),
    });
    
    if (!response.ok) throw new Error('country.is failed');
    
    const data = await response.json();
    if (data.country) {
      // This API only returns country code, need to map to full name
      const countryNames: Record<string, string> = {
        'US': 'United States',
        'GB': 'United Kingdom',
        'CA': 'Canada',
        'AU': 'Australia',
        'DE': 'Germany',
        'FR': 'France',
        'IT': 'Italy',
        'ES': 'Spain',
        'NL': 'Netherlands',
        'BE': 'Belgium',
        'CH': 'Switzerland',
        'AT': 'Austria',
        'SE': 'Sweden',
        'NO': 'Norway',
        'DK': 'Denmark',
        'FI': 'Finland',
        'PL': 'Poland',
        'CZ': 'Czech Republic',
        'IE': 'Ireland',
        'PT': 'Portugal',
        'GR': 'Greece',
        'JP': 'Japan',
        'CN': 'China',
        'IN': 'India',
        'BR': 'Brazil',
        'MX': 'Mexico',
        'AR': 'Argentina',
        'ZA': 'South Africa',
        'EG': 'Egypt',
        'NG': 'Nigeria',
        'KE': 'Kenya',
      };
      
      return {
        country: countryNames[data.country] || data.country,
        countryCode: data.country,
        success: true,
        provider: 'country.is',
      };
    }
  } catch (error) {
    console.error('country.is error:', error);
  }
  return null;
}

async function detectFromIPWhoIs(): Promise<LocationResponse | null> {
  try {
    const response = await fetch('https://ipwho.is/', {
      signal: AbortSignal.timeout(5000),
    });
    
    if (!response.ok) throw new Error('ipwho.is failed');
    
    const data = await response.json();
    if (data.country && data.country_code) {
      return {
        country: data.country,
        countryCode: data.country_code,
        city: data.city,
        success: true,
        provider: 'ipwho.is',
      };
    }
  } catch (error) {
    console.error('ipwho.is error:', error);
  }
  return null;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting server-side location detection...');
    
    // Try multiple providers in sequence
    const providers = [
      detectFromIPAPI,
      detectFromIPify,
      detectFromIPWhoIs,
      detectFromCountryIS,
    ];
    
    for (const provider of providers) {
      const result = await provider();
      if (result && result.success) {
        console.log(`Location detected successfully via ${result.provider}`);
        return new Response(
          JSON.stringify(result),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }
    
    // All providers failed
    console.error('All location detection providers failed');
    return new Response(
      JSON.stringify({
        success: false,
        error: 'All location detection providers failed',
        country: 'Worldwide',
        countryCode: 'WW',
      } as LocationResponse),
      { 
        status: 200, // Return 200 even on failure to allow graceful degradation
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
    
  } catch (error) {
    console.error('Error in detect-location function:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Unknown error occurred',
        country: 'Worldwide',
        countryCode: 'WW',
      } as LocationResponse),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
