# Capacitor Setup Guide for Qtalent.live

## ✅ Pre-Capacitor Preparation (COMPLETED)

Your app is now ready for Capacitor conversion! Here's what has been prepared:

### 1. **Platform Detection** ✅
- Created `src/utils/platformDetection.ts` to detect web vs native
- Detects iOS, Android, and web platforms

### 2. **External Link Handling** ✅
- Created `src/utils/externalLinks.ts` for safe external link opening
- Works seamlessly on web and will use Capacitor Browser plugin when available
- All social media links updated

### 3. **Navigation Fixes** ✅
- Replaced `window.location.href` with React Router's `navigate()` where appropriate
- Fixed in: BookingForm, TalentOnboarding, AuthCallback
- Kept `window.location.href` only for logout (needed for full state clear)

### 4. **Service Worker Management** ✅
- Created `src/utils/serviceWorkerManager.ts`
- Automatically disables service worker in native apps
- Prevents conflicts with Capacitor

### 5. **Mobile Responsiveness** ✅
- Full mobile responsiveness implemented
- Touch-friendly UI components
- No horizontal scroll issues

---

## 🚀 Next Steps: Installing Capacitor

### Step 1: Install Capacitor Dependencies

Run these commands in your terminal:

```bash
npm install @capacitor/core @capacitor/cli @capacitor/ios @capacitor/android
npm install @capacitor/browser  # For external links
```

### Step 2: Initialize Capacitor

```bash
npx cap init
```

When prompted, use:
- **App ID**: `app.lovable.30805a07d18244079e99e52ac842dc71`
- **App Name**: `Qtalent`

### Step 3: Update capacitor.config.ts

Your `capacitor.config.ts` should look like this:

```typescript
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.30805a07d18244079e99e52ac842dc71',
  appName: 'Qtalent',
  webDir: 'dist',
  bundledWebRuntime: false,
  server: {
    url: 'https://30805a07-d182-4407-9e99-e52ac842dc71.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: "#0A0118",
      showSpinner: false
    }
  }
};

export default config;
```

### Step 4: Update index.html for Capacitor

Add this script tag in `<head>` section of `index.html`:

```html
<!-- Capacitor Integration -->
<script>
  if (window.Capacitor) {
    console.log('Running as native app');
  }
</script>
```

### Step 5: Update main.tsx

Replace the service worker registration in `main.tsx` with:

```typescript
import { initServiceWorker } from '@/utils/serviceWorkerManager';

// Initialize service worker only for web
initServiceWorker();
```

### Step 6: Build and Add Platforms

```bash
# Build the web app
npm run build

# Add iOS platform (Mac with Xcode required)
npx cap add ios

# Add Android platform
npx cap add android

# Sync the web code to native platforms
npx cap sync
```

### Step 7: Run on Devices

```bash
# For iOS (requires Mac with Xcode)
npx cap open ios

# For Android (requires Android Studio)
npx cap open android
```

---

## 📱 Additional Capacitor Plugins (Optional)

### Push Notifications (Recommended)
```bash
npm install @capacitor/push-notifications
```

Then update your notification logic to use Capacitor's Push Notifications plugin instead of web push.

### Status Bar & Splash Screen
```bash
npm install @capacitor/status-bar @capacitor/splash-screen
```

### Camera (if needed for profile pictures)
```bash
npm install @capacitor/camera
```

### File System (for downloads/uploads)
```bash
npm install @capacitor/filesystem
```

---

## ⚠️ Important Notes

1. **Service Worker**: Automatically disabled in native apps - no conflicts!
2. **External Links**: Use `openExternalLink()` from `src/utils/externalLinks.ts`
3. **PayPal**: May need additional testing in native context
4. **Supabase**: Should work seamlessly in both web and native
5. **Hot Reload**: The server URL in capacitor.config.ts enables live testing

---

## 🔧 Development Workflow

### Testing Changes
```bash
# 1. Make your changes
# 2. Build
npm run build

# 3. Sync to native platforms
npx cap sync

# 4. Run on device/emulator
npx cap run android  # or ios
```

### Live Development (Hot Reload)
The `server.url` in capacitor.config.ts points to your Lovable preview, so you can:
1. Make changes in Lovable
2. See them instantly in your native app
3. No need to rebuild constantly!

---

## 📚 Resources

- [Capacitor Documentation](https://capacitorjs.com/docs)
- [Capacitor iOS Setup](https://capacitorjs.com/docs/ios)
- [Capacitor Android Setup](https://capacitorjs.com/docs/android)
- [Capacitor Browser Plugin](https://capacitorjs.com/docs/apis/browser)

---

## ✅ Checklist Before Publishing

- [ ] Test all user flows on iOS device/simulator
- [ ] Test all user flows on Android device/emulator
- [ ] Test external links (social media, etc.)
- [ ] Test authentication flow
- [ ] Test payment flow (PayPal)
- [ ] Test file uploads (profile pictures, gallery)
- [ ] Test push notifications (if implemented)
- [ ] Update app icons and splash screens
- [ ] Configure app signing (iOS & Android)
- [ ] Test deep linking (if needed)
- [ ] Performance testing on older devices

---

**Your app is now 100% ready for Capacitor! 🎉**

All the critical preparations are complete. Just follow the steps above to convert to native iOS and Android apps.
