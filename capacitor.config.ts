import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.30805a07d18244079e99e52ac842dc71',
  appName: 'qtalent',
  webDir: 'dist',
  server: {
    url: 'https://30805a07-d182-4407-9e99-e52ac842dc71.lovableproject.com?forceHideBadge=true',
    cleartext: true,
    androidScheme: 'https'
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#0A0118',
      showSpinner: false,
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert']
    }
  }
};

export default config;
