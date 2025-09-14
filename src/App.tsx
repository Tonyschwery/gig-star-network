import { Toaster } from "@/components/ui/toaster";
import "@/utils/testEmailSystem";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Routes, Route } from "react-router-dom";
import { AuthProvider } from "./hooks/useAuth";
import { AdminProvider } from "./hooks/useAdminAuth";
import { UserModeProvider } from "./contexts/UserModeContext";
import { ChatProvider } from "./contexts/ChatContext";
import { UniversalChat } from "./components/UniversalChat";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Login from "./pages/Login";
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

const App = () => (
  <AuthProvider>
    <UserModeProvider>
      <ChatProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <UniversalChat />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/login" element={<Login />} />
            
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
            </Route>
            
            <Route path="/booker-dashboard" element={<ProtectedRoute><BookerDashboard /></ProtectedRoute>} />
            <Route path="/talent-onboarding" element={<ProtectedTalentRoute requireProfile={false}><TalentOnboarding /></ProtectedTalentRoute>} />
            <Route path="/talent-dashboard" element={<ProtectedTalentRoute><TalentDashboard /></ProtectedTalentRoute>} />
            <Route path="/talent-profile-edit" element={<ProtectedTalentRoute><TalentProfileEdit /></ProtectedTalentRoute>} />
            
            <Route path="/talent/:id" element={<TalentProfile />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </TooltipProvider>
      </ChatProvider>
    </UserModeProvider>
  </AuthProvider>
);

export default App;