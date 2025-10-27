import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { initChromeOptimizations } from "./utils/chromeOptimizer";
import { checkAndUpdateVersion } from "./utils/versionCheck";
import { initServiceWorker } from "./utils/serviceWorkerManager";
import App from "./App.tsx";
import "./index.css";

// Check version and clear caches if needed (MUST be first)
checkAndUpdateVersion();

// Initialize Chrome optimizations immediately
initChromeOptimizations();

// Initialize service worker for web (disabled on native)
initServiceWorker();

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
