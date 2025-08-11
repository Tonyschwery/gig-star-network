import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './hooks/useAuth';
import { UserModeProvider } from './contexts/UserModeContext';
import { Toaster } from "./components/ui/toaster"

// Import Pages
import Index from './pages/Index';
import Login from './pages/Login';
import Auth from './pages/Auth';
import TalentDashboard from './pages/TalentDashboard';
import BookerDashboard from './pages/BookerDashboard';
import TalentProfile from './pages/TalentProfile';
import TalentProfileEdit from './pages/TalentProfileEdit';
import TalentOnboarding from './pages/TalentOnboarding';
import HowItWorks from './pages/HowItWorks';
import Pricing from './pages/Pricing';
import TrustSafety from './pages/TrustSafety';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsOfService from './pages/TermsOfService';
import YourEvent from './pages/YourEvent';
import NotFound from './pages/NotFound';
import Messages from './pages/Messages';

// Import Components
import ProtectedRoute from './components/ProtectedRoute';
import ProtectedTalentRoute from './components/ProtectedTalentRoute';
import { UniversalChatWidget } from './components/UniversalChatWidget';

function App() {
  return (
    <Router>
      <AuthProvider>
        <UserModeProvider>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/talent/:id" element={<TalentProfile />} />
            <Route path="/how-it-works" element={<HowItWorks />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/trust-safety" element={<TrustSafety />} />
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
            <Route path="/terms-of-service" element={<TermsOfService />} />
            <Route path="/your-event" element={<YourEvent />} />

            {/* Protected Routes */}
            <Route path="/talent-dashboard/*" element={<ProtectedTalentRoute><TalentDashboard /></ProtectedTalentRoute>} />
            <Route path="/booker-dashboard" element={<ProtectedRoute><BookerDashboard /></ProtectedRoute>} />
            <Route path="/talent-profile-edit" element={<ProtectedTalentRoute><TalentProfileEdit /></ProtectedTalentRoute>} />
            <Route path="/talent-onboarding" element={<ProtectedRoute><TalentOnboarding /></ProtectedRoute>} />
            <Route path="/messages" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
            
            {/* 404 Not Found Route */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          <UniversalChatWidget />
          <Toaster />
        </UserModeProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
