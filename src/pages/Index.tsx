import { Header } from "@/components/Header";
import { HeroSection } from "@/components/HeroSection";
import { HowItWorks } from "@/components/HowItWorks";
import { TalentGrid } from "@/components/TalentGrid";
import { FeaturedProArtists } from "@/components/FeaturedProArtists";
import { Footer } from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <HeroSection />
        <HowItWorks />
        <FeaturedProArtists />
        <TalentGrid />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
