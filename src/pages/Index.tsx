import { Header } from "@/components/Header";
import { HeroSection } from "@/components/HeroSection";
import { TalentGrid } from "@/components/TalentGrid";
import { Footer } from "@/components/Footer";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const Index = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const redirectLoggedInUser = async () => {
      if (loading || !user) return;

      // Check user type and redirect appropriately
      const userMetadata = user.user_metadata;
      const isBooker = userMetadata?.user_type === 'booker' || !userMetadata?.user_type;
      
      if (isBooker) {
        navigate("/booker-dashboard");
      } else {
        // Check if talent has profile
        const { data: hasProfile } = await supabase.rpc('check_talent_profile_exists', {
          user_id_to_check: user.id
        });
        
        if (hasProfile) {
          navigate("/talent-dashboard");
        } else {
          navigate("/talent-onboarding");
        }
      }
    };

    redirectLoggedInUser();
  }, [user, loading, navigate]);

  // Show loading while checking auth status
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

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
