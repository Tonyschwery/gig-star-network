import { Header } from "@/components/Header";
import { HeroSection } from "@/components/HeroSection";
import { TalentGrid } from "@/components/TalentGrid";
import { Footer } from "@/components/Footer";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
//9pm
const Index = () => {
  const { status } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect logic is now centralized in useAuth and the protected routes.
    // This effect is to handle the specific case of an already-logged-in user landing on the homepage.
    if (status === 'TALENT_COMPLETE' || status === 'TALENT_NEEDS_ONBOARDING') {
      navigate('/talent-dashboard');
    } else if (status === 'BOOKER') {
      navigate('/booker-dashboard');
    }
  }, [status, navigate]);

  // The page can render while the check is happening, as it will be redirected if necessary.
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <HeroSection />
        <TalentGrid />
      </main>
      <Footer />
    </div>
  );
};

export default Index;