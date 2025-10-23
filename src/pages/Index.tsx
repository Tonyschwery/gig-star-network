import { useEffect } from "react";
import { Header } from "@/components/Header";
import { HeroSection } from "@/components/HeroSection";
import { TalentGrid } from "@/components/TalentGrid";
import { Footer } from "@/components/Footer";
import { useLocationDetection } from "@/hooks/useLocationDetection";

const Index = () => {
  const { userLocation } = useLocationDetection();
  
  // Location detection now happens automatically in the hook

  return (
    <div className="min-h-screen bg-background w-full max-w-full overflow-x-hidden">
      <Header />
      <main className="w-full max-w-full overflow-x-hidden">
        <HeroSection />
        <TalentGrid />
      </main>
      <Footer />
    </div>
  );
};

export default Index;