import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./hooks/useAuth";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import BookerDashboard from "./pages/BookerDashboard";
import TalentOnboarding from "./pages/TalentOnboarding";
import TalentProfile from "./pages/TalentProfile";
import TalentDashboard from "./pages/TalentDashboard";
import TalentProfileEdit from "./pages/TalentProfileEdit";
import YourEvent from "./pages/YourEvent";
import Gigs from "./pages/Gigs";
import Pricing from "./pages/Pricing";
import HowItWorks from "./pages/HowItWorks";
import TrustSafety from "./pages/TrustSafety";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import NotFound from "./pages/NotFound";
import { ProtectedTalentRoute } from "./components/ProtectedTalentRoute";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/booker-dashboard" element={<BookerDashboard />} />
            <Route path="/talent-onboarding" element={
              <ProtectedTalentRoute requireProfile={false}>
                <TalentOnboarding />
              </ProtectedTalentRoute>
            } />
            <Route path="/talent/:id" element={<TalentProfile />} />
            <Route path="/talent-dashboard" element={
              <ProtectedTalentRoute>
                <TalentDashboard />
              </ProtectedTalentRoute>
            } />
            <Route path="/talent-profile-edit" element={
              <ProtectedTalentRoute>
                <TalentProfileEdit />
              </ProtectedTalentRoute>
            } />
            <Route path="/your-event" element={<YourEvent />} />
            <Route path="/gigs" element={
              <ProtectedTalentRoute>
                <Gigs />
              </ProtectedTalentRoute>
            } />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/how-it-works" element={<HowItWorks />} />
            <Route path="/trust-safety" element={<TrustSafety />} />
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
            <Route path="/terms-of-service" element={<TermsOfService />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
