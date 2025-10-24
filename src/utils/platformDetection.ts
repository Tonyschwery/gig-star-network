/**
 * Platform Detection Utility for Capacitor
 * Detects if the app is running as a native mobile app via Capacitor
 * or as a web app in a browser
 */

export const isCapacitor = () => {
  return !!(window as any).Capacitor;
};

export const isIOS = () => {
  if (!isCapacitor()) return false;
  return (window as any).Capacitor?.getPlatform() === 'ios';
};

export const isAndroid = () => {
  if (!isCapacitor()) return false;
  return (window as any).Capacitor?.getPlatform() === 'android';
};

export const isWeb = () => {
  return !isCapacitor();
};

export const getPlatform = () => {
  if (isCapacitor()) {
    return (window as any).Capacitor?.getPlatform() || 'unknown';
  }
  return 'web';
};
