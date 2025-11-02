import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { initChromeOptimizations } from "./utils/chromeOptimizer";
import { checkAndUpdateVersion } from "./utils/versionCheck";
import { initServiceWorker } from "./utils/serviceWorkerManager";
import { setupBackButtonHandler } from "./utils/backButtonHandler";
import { Capacitor } from '@capacitor/core';
import App from "./App.tsx";
import "./index.css";

// Add platform-specific classes for Capacitor native apps
if (Capacitor.isNativePlatform()) {
  const htmlElement = document.documentElement;
  const bodyElement = document.body;
  
  // Add generic native class
  htmlElement.classList.add('capacitor-native');
  bodyElement.classList.add('capacitor-native');
  
  // Add platform-specific classes
  const platform = Capacitor.getPlatform();
  if (platform === 'ios') {
    htmlElement.classList.add('plt-ios');
    bodyElement.classList.add('plt-ios');
  } else if (platform === 'android') {
    htmlElement.classList.add('plt-android');
    bodyElement.classList.add('plt-android');
  }
  
  console.log('✅ Capacitor native platform detected:', platform);
}

// Check version and clear caches if needed (MUST be first)
checkAndUpdateVersion();

// Initialize Chrome optimizations immediately
initChromeOptimizations();

// Initialize service worker for web only (not on native platforms)
if (!Capacitor.isNativePlatform()) {
  initServiceWorker();
}

// Setup Android back button handler for Capacitor
setupBackButtonHandler();

const queryClient = new QueryClient();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);
