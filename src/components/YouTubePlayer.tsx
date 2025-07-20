import { useState } from 'react';
import YouTube from 'react-youtube';
import { Play, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface YouTubePlayerProps {
  url: string;
  onThumbnailClick?: () => void;
}

const extractVideoId = (url: string): string | null => {
  const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[7].length === 11) ? match[7] : null;
};

const getThumbnailUrl = (videoId: string): string => {
  return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
};

export function YouTubePlayer({ url, onThumbnailClick }: YouTubePlayerProps) {
  const [showPlayer, setShowPlayer] = useState(false);
  const [thumbnailError, setThumbnailError] = useState(false);
  
  const videoId = extractVideoId(url);
  
  if (!videoId) {
    return (
      <div className="bg-muted rounded-lg p-4 text-center">
        <p className="text-sm text-muted-foreground">Invalid YouTube URL</p>
      </div>
    );
  }

  const thumbnailUrl = getThumbnailUrl(videoId);
  const fallbackThumbnail = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;

  const handleThumbnailClick = () => {
    setShowPlayer(true);
    onThumbnailClick?.();
  };

  const opts = {
    height: '200',
    width: '100%',
    playerVars: {
      autoplay: 1,
      modestbranding: 1,
      rel: 0,
    },
  };

  if (showPlayer) {
    return (
      <div className="relative w-full rounded-lg overflow-hidden bg-black">
        <YouTube
          videoId={videoId}
          opts={opts}
          className="w-full"
          iframeClassName="w-full h-[200px] rounded-lg"
        />
      </div>
    );
  }

  return (
    <div className="relative group cursor-pointer rounded-lg overflow-hidden bg-black">
      <img
        src={thumbnailError ? fallbackThumbnail : thumbnailUrl}
        alt="YouTube video thumbnail"
        className="w-full h-[200px] object-cover group-hover:scale-105 transition-transform duration-300"
        onError={() => setThumbnailError(true)}
        onClick={handleThumbnailClick}
      />
      
      {/* Play button overlay */}
      <div 
        className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/40 transition-colors"
        onClick={handleThumbnailClick}
      >
        <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
          <Play className="h-8 w-8 text-white ml-1" fill="white" />
        </div>
      </div>
      
      {/* External link button */}
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          size="sm"
          variant="secondary"
          onClick={(e) => {
            e.stopPropagation();
            window.open(url, '_blank');
          }}
          className="h-8 px-2"
        >
          <ExternalLink className="h-3 w-3" />
        </Button>
      </div>
      
      {/* YouTube badge */}
      <div className="absolute bottom-2 right-2 bg-red-600 text-white text-xs px-2 py-1 rounded">
        YouTube
      </div>
    </div>
  );
}