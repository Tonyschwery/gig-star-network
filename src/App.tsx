// FILE: src/App.tsx

import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Routes, Route } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client"; // Ensure supabase is imported
import { AuthProvider } from "./hooks/useAuth";
import { UserModeProvider } from "./contexts/UserModeContext";
import { ChatProvider } from "./contexts/ChatContext";
import { ProStatusProvider } from "./contexts/ProStatusContext";
import { UniversalChat } from "./components/UniversalChat";
import { PWAInstallPrompt } from "./components/PWAInstallPrompt";
import { NotificationPermissionPrompt } from "./components/NotificationPermissionPrompt";
import { useRealtimeNotifications } from "./hooks/useRealtimeNotifications";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import BookerDashboard from "./pages/BookerDashboard";
import TalentOnboarding from "./pages/TalentOnboarding";
import TalentProfile from "./pages/TalentProfile";
import TalentDashboard from "./pages/TalentDashboard";
import TalentProfileEdit from "./pages/TalentProfileEdit";
import AdminDashboard from "./pages/AdminDashboard";
import { AdminLayout } from "./components/admin/AdminLayout";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminBookings from "./pages/admin/AdminBookings";
import NotFound from "./pages/NotFound";
import { ProtectedTalentRoute } from "./components/ProtectedTalentRoute";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AdminRoute } from "./components/AdminRoute";
import YourEvent from "./pages/YourEvent";
import Pricing from "./pages/Pricing";
import AuthCallback from "./pages/AuthCallback";
import UpdatePassword from "./pages/UpdatePassword";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import TrustSafety from "./pages/TrustSafety";
import ResetPassword from "./pages/ResetPassword";
import SubscriptionSuccess from "./pages/SubscriptionSuccess";
import SubscriptionCancelled from "./pages/SubscriptionCancelled";

// 🔐 Global auth listener with PASSWORD_RECOVERY detection
supabase.auth.onAuthStateChange((event, session) => {
  console.log("Supabase Auth State Change Event:", { event, session });
  
  // Set recovery flag when PASSWORD_RECOVERY event is detected
  if (event === 'PASSWORD_RECOVERY') {
    sessionStorage.setItem('isPasswordRecovery', 'true');
    console.log("[App] PASSWORD_RECOVERY event detected globally - recovery flag set");
  }
});

const AppContent = () => {
  useRealtimeNotifications();

  return (
    <>
      <Toaster />
      <Sonner />
      <UniversalChat />
      <PWAInstallPrompt />
      <NotificationPermissionPrompt />
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/login" element={<Auth />} />
        <Route
          path="/admin"
          element={
            <AdminRoute>
              <AdminLayout />
            </AdminRoute>
          }
        >
          <Route index element={<AdminDashboard />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="bookings" element={<AdminBookings />} />
        </Route>
        <Route
          path="/booker-dashboard"
          element={
            <ProtectedRoute>
              <BookerDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/your-event"
          element={
            <ProtectedRoute>
              <YourEvent />
            </ProtectedRoute>
          }
        />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/update-password" element={<UpdatePassword />} />
        <Route path="/privacy-policy" element={<PrivacyPolicy />} />
        <Route path="/terms-of-service" element={<TermsOfService />} />
        <Route path="/trust-safety" element={<TrustSafety />} />
        <Route path="/subscription-success" element={<SubscriptionSuccess />} />
        <Route path="/subscription-cancelled" element={<SubscriptionCancelled />} />
        <Route path="/talent-onboarding" element={<TalentOnboarding />} />
        <Route
          path="/talent-dashboard"
          element={
            <ProtectedTalentRoute>
              <TalentDashboard />
            </ProtectedTalentRoute>
          }
        />
        <Route
          path="/talent-profile-edit"
          element={
            <ProtectedTalentRoute>
              <TalentProfileEdit />
            </ProtectedTalentRoute>
          }
        />
        <Route path="/talent/:id" element={<TalentProfile />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
};

const App = () => (
  <AuthProvider>
    <ProStatusProvider>
      <UserModeProvider>
        <ChatProvider>
          <TooltipProvider>
            <AppContent />
          </TooltipProvider>
        </ChatProvider>
      </UserModeProvider>
    </ProStatusProvider>
  </AuthProvider>
);

export default App;
