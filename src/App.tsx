import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Routes, Route, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { AuthProvider } from "./hooks/useAuth";
import { UserModeProvider } from "./contexts/UserModeContext";
import { ChatProvider } from "./contexts/ChatContext";
import { ProStatusProvider } from "./contexts/ProStatusContext";
import { UniversalChat } from "./components/UniversalChat";
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
import { forceClearAuth } from "@/lib/auth-utils";

const App = () => {
  const navigate = useNavigate();

  // Back button handler - only clear cache/session on back
  useEffect(() => {
    const handlePopState = async () => {
      try {
        await forceClearAuth({ fullClear: true });
        navigate("/", { replace: true });
      } catch (err) {
        console.error("Failed clearing on back button:", err);
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [navigate]);

  return (
    <AuthProvider>
      <ProStatusProvider>
        <UserModeProvider>
          <ChatProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <UniversalChat />

              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/login" element={<Auth />} />

                <Route path="/admin" element={<AdminRoute><AdminLayout /></AdminRoute>}>
                  <Route index element={<AdminDashboard />} />
                  <Route path="users" element={<AdminUsers />} />
                  <Route path="bookings" element={<AdminBookings />} />
                </Route>

                <Route path="/booker-dashboard" element={<ProtectedRoute><BookerDashboard /></ProtectedRoute>} />
                <Route path="/your-event" element={<ProtectedRoute><YourEvent /></ProtectedRoute>} />
                <Route path="/pricing" element={<Pricing />} />

                <Route path="/talent-onboarding" element={<ProtectedTalentRoute><TalentOnboarding /></ProtectedTalentRoute>} />
                <Route path="/talent-dashboard" element={<ProtectedTalentRoute><TalentDashboard /></ProtectedTalentRoute>} />
                <Route path="/talent-profile-edit" element={<ProtectedTalentRoute><TalentProfileEdit /></ProtectedTalentRoute>} />

                <Route path="/talent/:id" element={<TalentProfile />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </TooltipProvider>
          </ChatProvider>
        </UserModeProvider>
      </ProStatusProvider>
    </AuthProvider>
  );
};

export default App;
