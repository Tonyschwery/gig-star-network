/**
 * External Link Handler for Capacitor
 * Handles opening external links differently for web vs native apps
 */

import { isCapacitor } from './platformDetection';

/**
 * Opens an external URL safely
 * - In web: Uses window.open with security flags
 * - In native: Will use Capacitor Browser plugin (when installed)
 */
export const openExternalLink = async (url: string) => {
  if (!url) return;

  if (isCapacitor()) {
    // Check if Capacitor Browser plugin is available at runtime
    const Browser = (window as any).Capacitor?.Plugins?.Browser;
    
    if (Browser) {
      try {
        await Browser.open({ url });
        return;
      } catch (error) {
        console.log('Capacitor Browser failed, falling back to window.open');
      }
    }
  }
  
  // Fallback for web or if Capacitor Browser isn't available
  window.open(url, '_blank', 'noopener,noreferrer');
};

/**
 * Opens social media links
 */
export const openSocialLink = (url: string) => {
  return openExternalLink(url);
};
