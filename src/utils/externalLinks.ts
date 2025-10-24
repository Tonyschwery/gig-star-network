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
    // For Capacitor, check if Browser plugin is available
    try {
      // Dynamic import to prevent build errors when @capacitor/browser is not installed
      const { Browser } = await import('@capacitor/browser' as any);
      await Browser.open({ url });
    } catch (error) {
      console.log('Capacitor Browser plugin not available, falling back to window.open');
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  } else {
    // For web, use standard window.open
    window.open(url, '_blank', 'noopener,noreferrer');
  }
};

/**
 * Opens social media links
 */
export const openSocialLink = (url: string) => {
  return openExternalLink(url);
};
