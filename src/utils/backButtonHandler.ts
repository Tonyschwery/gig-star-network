// Handle Android back button in Capacitor
import { App as CapacitorApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';

export function setupBackButtonHandler() {
  // Only run on native platforms (Android/iOS)
  if (!Capacitor.isNativePlatform()) {
    return;
  }

  CapacitorApp.addListener('backButton', ({ canGoBack }) => {
    if (canGoBack) {
      // Navigate back in history
      window.history.back();
    } else {
      // If we can't go back, exit the app
      CapacitorApp.exitApp();
    }
  });
}

export function cleanupBackButtonHandler() {
  if (!Capacitor.isNativePlatform()) {
    return;
  }
  
  CapacitorApp.removeAllListeners();
}
