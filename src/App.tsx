import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Routes, Route } from "react-router-dom";
import { AuthProvider } from "./hooks/useAuth";
import { AdminProvider } from "./hooks/useAdminAuth";
import { UserModeProvider } from "./contexts/UserModeContext";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Login from "./pages/Login";
import BookerDashboard from "./pages/BookerDashboard";
import TalentOnboarding from "./pages/TalentOnboarding";
import TalentProfile from "./pages/TalentProfile";
import TalentDashboard from "./pages/TalentDashboard";
import TalentDashboardBookings from "./pages/TalentDashboardBookings";
import TalentProfileEdit from "./pages/TalentProfileEdit";
import AdminDashboard from "./pages/AdminDashboard";
import YourEvent from "./pages/YourEvent";


import Pricing from "./pages/Pricing";
import HowItWorks from "./pages/HowItWorks";
import TrustSafety from "./pages/TrustSafety";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import NotFound from "./pages/NotFound";
import { ProtectedTalentRoute } from "./components/ProtectedTalentRoute";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AdminRoute } from "./components/AdminRoute";

const App = () => (
  <AuthProvider>
    <AdminProvider>
      <UserModeProvider>
        <TooltipProvider>
        <Toaster />
        <Sonner />
        <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/login" element={<Login />} />
            <Route path="/admin" element={
              <AdminRoute>
                <AdminDashboard />
              </AdminRoute>
            } />
            <Route path="/booker-dashboard" element={
              <ProtectedRoute>
                <BookerDashboard />
              </ProtectedRoute>
            } />
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
            <Route path="/talent-dashboard/bookings" element={
              <ProtectedTalentRoute>
                <TalentDashboardBookings />
              </ProtectedTalentRoute>
            } />
            <Route path="/talent-profile-edit" element={
              <ProtectedTalentRoute>
                <TalentProfileEdit />
              </ProtectedTalentRoute>
            } />
            <Route path="/your-event" element={<YourEvent />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/how-it-works" element={<HowItWorks />} />
            <Route path="/trust-safety" element={<TrustSafety />} />
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
            <Route path="/terms-of-service" element={<TermsOfService />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
        </Routes>
        </TooltipProvider>
      </UserModeProvider>
    </AdminProvider>
  </AuthProvider>
);

export default App;
