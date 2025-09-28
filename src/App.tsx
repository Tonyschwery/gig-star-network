// FILE: src/App.tsx

import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Routes, Route } from "react-router-dom";
import { AuthProvider } from "./hooks/useAuth";
import { UserModeProvider } from "./contexts/UserModeContext";
import { ChatProvider } from "./contexts/ChatContext";
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
            
            {/* The old AdminProvider wrapper is now removed */}
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
  </AuthProvider>
);

export default App;