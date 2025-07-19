import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Star, MapPin, Music, Mic, Camera, Brush } from "lucide-react";

export function TalentGrid() {
  const talents = [
    {
      id: 1,
      name: "Emma Wilson",
      category: "Wedding Singer",
      location: "Chicago, IL",
      rating: 4.9,
      reviews: 127,
      startingPrice: 450,
      image: "/placeholder.svg",
      isPro: true,
      tags: ["Jazz", "Pop", "Classical"],
      icon: <Mic className="h-4 w-4" />
    },
    {
      id: 2,
      name: "DJ Marcus",
      category: "Electronic DJ",
      location: "Miami, FL",
      rating: 4.8,
      reviews: 89,
      startingPrice: 350,
      image: "/placeholder.svg",
      isPro: false,
      tags: ["House", "Techno", "EDM"],
      icon: <Music className="h-4 w-4" />
    },
    {
      id: 3,
      name: "Lisa Chen",
      category: "Event Photographer",
      location: "San Francisco, CA",
      rating: 5.0,
      reviews: 203,
      startingPrice: 800,
      image: "/placeholder.svg",
      isPro: true,
      tags: ["Wedding", "Corporate", "Portrait"],
      icon: <Camera className="h-4 w-4" />
    },
    {
      id: 4,
      name: "Alex Rivera",
      category: "Live Painter",
      location: "Austin, TX",
      rating: 4.7,
      reviews: 45,
      startingPrice: 600,
      image: "/placeholder.svg",
      isPro: false,
      tags: ["Live Art", "Portraits", "Abstract"],
      icon: <Brush className="h-4 w-4" />
    }
  ];

  return (
    <section className="py-24">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-4">Featured Talents</h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Discover amazing performers and creators ready to make your event unforgettable
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {talents.map((talent) => (
            <TalentCard key={talent.id} talent={talent} />
          ))}
        </div>

        <div className="text-center mt-12">
          <Button className="hero-button">
            View All Talents
          </Button>
        </div>
      </div>
    </section>
  );
}

interface TalentCardProps {
  talent: {
    id: number;
    name: string;
    category: string;
    location: string;
    rating: number;
    reviews: number;
    startingPrice: number;
    image: string;
    isPro: boolean;
    tags: string[];
    icon: React.ReactNode;
  };
}

function TalentCard({ talent }: TalentCardProps) {
  return (
    <Card className="overflow-hidden glass-card hover:shadow-elevated transition-all duration-300 hover:scale-105 group">
      <div className="relative">
        <img 
          src={talent.image} 
          alt={talent.name}
          className="w-full h-48 object-cover group-hover:scale-110 transition-transform duration-500"
        />
        {talent.isPro && (
          <div className="absolute top-3 right-3 pro-badge">
            PRO
          </div>
        )}
        <div className="absolute top-3 left-3 flex items-center space-x-1 bg-black/50 backdrop-blur-sm rounded-lg px-2 py-1">
          {talent.icon}
          <span className="text-xs text-white">{talent.category}</span>
        </div>
      </div>
      
      <div className="p-4 space-y-3">
        <div>
          <h3 className="font-semibold text-lg">{talent.name}</h3>
          <div className="flex items-center space-x-1 text-sm text-muted-foreground">
            <MapPin className="h-3 w-3" />
            <span>{talent.location}</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-1">
          {talent.tags.map((tag) => (
            <Badge key={tag} variant="secondary" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-1">
            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
            <span className="text-sm font-medium">{talent.rating}</span>
            <span className="text-xs text-muted-foreground">
              ({talent.reviews})
            </span>
          </div>
          <div className="text-right">
            <div className="text-lg font-bold text-brand-primary">
              ${talent.startingPrice}
            </div>
            <div className="text-xs text-muted-foreground">starting from</div>
          </div>
        </div>

        <Button variant="outline" className="w-full">
          View Profile
        </Button>
      </div>
    </Card>
  );
}