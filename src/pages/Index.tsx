import { useEffect } from "react";
import { Header } from "@/components/Header";
import { HeroSection } from "@/components/HeroSection";
import { TalentGrid } from "@/components/TalentGrid";
import { Footer } from "@/components/Footer";
import { useLocationDetection } from "@/hooks/useLocationDetection";

const Index = () => {
  const { detectLocation, userLocation } = useLocationDetection();
  
  // Auto-detect location on mount if not already set
  useEffect(() => {
    if (!userLocation) {
      detectLocation();
    }
  }, []);

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