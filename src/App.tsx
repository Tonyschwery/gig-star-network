import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Toaster } from "@/components/ui/toaster";
import "@/utils/testEmailSystem";
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
import { AdminLayout } from "./components/admin/AdminLayout";
import AdminEventRequests from "./pages/admin/AdminEventRequests";
import AdminDirectMessages from "./pages/admin/AdminDirectMessages";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminBookings from "./pages/admin/AdminBookings";
import AdminMessages from "./pages/admin/AdminMessages";
import AdminPayments from "./pages/admin/AdminPayments";
import AdminSettings from "./pages/admin/AdminSettings";
import AdminReports from "./pages/admin/AdminReports";
import YourEvent from "./pages/YourEvent";
import SubscriptionSuccess from "./pages/SubscriptionSuccess";
import SubscriptionCancelled from "./pages/SubscriptionCancelled";
import Pricing from "./pages/Pricing";
import HowItWorks from "./pages/HowItWorks";
import TrustSafety from "./pages/TrustSafety";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import NotFound from "./pages/NotFound";
import { ProtectedTalentRoute } from "./components/ProtectedTalentRoute";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AdminRoute } from "./components/AdminRoute";

const App = () => {
  const navigate = useNavigate();

  // This handles the automatic login and redirect from email links
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      // This event fires specifically after a new user clicks their confirmation link
      if (event === 'SIGNED_IN' && session) {
        
        // We check the 'user_type' that was set during signup
        const userType = session.user.user_metadata?.user_type;

        if (userType === 'talent') {
          // A NEW talent is correctly sent to the onboarding form
          navigate('/talent-onboarding');
        } else if (userType === 'booker') {
          // A NEW booker is correctly sent to their dashboard
          navigate('/booker-dashboard');
        } else {
          // As a safe fallback, send any other user to the homepage
          navigate('/');
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [navigate]);

  return (
    <AuthProvider>
      <UserModeProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <Routes>
              {/* Public Routes */}
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/login" element={<Login />} />
              <Route path="/talent/:id" element={<TalentProfile />} />
              <Route path="/your-event" element={<YourEvent />} />
              <Route path="/pricing" element={<Pricing />} />
              <Route path="/how-it-works" element={<HowItWorks />} />
              <Route path="/trust-safety" element={<TrustSafety />} />
              <Route path="/privacy-policy" element={<PrivacyPolicy />} />
              <Route path="/terms-of-service" element={<TermsOfService />} />
              <Route path="/subscription-success" element={<SubscriptionSuccess />} />
              <Route path="/subscription-cancelled" element={<SubscriptionCancelled />} />

              {/* Admin Routes */}
              <Route path="/admin" element={
                <AdminProvider>
                  <AdminRoute>
                    <AdminLayout />
                  </AdminRoute>
                </AdminProvider>
              }>
                <Route index element={<AdminDashboard />} />
                <Route path="users" element={<AdminUsers />} />
                <Route path="bookings" element={<AdminBookings />} />
                <Route path="payments" element={<AdminPayments />} />
                <Route path="messages" element={<AdminMessages />} />
                <Route path="direct-messages" element={<AdminDirectMessages />} />
                <Route path="event-requests" element={<AdminEventRequests />} />
                <Route path="settings" element={<AdminSettings />} />
                <Route path="reports" element={<AdminReports />} />
              </Route>
              
              {/* Protected User Routes */}
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
              
              {/* Catch-all Not Found Route */}
              <Route path="*" element={<NotFound />} />
          </Routes>
        </TooltipProvider>
      </UserModeProvider>
    </AuthProvider>
  );
};

export default App;