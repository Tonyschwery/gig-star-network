import { Header } from "@/components/Header";
import { HeroSection } from "@/components/HeroSection";
import { TalentGrid } from "@/components/TalentGrid";
import { Footer } from "@/components/Footer";
//9pm
// THE FIX: All of the complex redirect logic has been completely removed.
// This is now a simple, "dumb" page that just displays its content.
// This allows logged-in users to visit the homepage without being trapped.
const Index = () => {
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