import React from 'react';

interface SoundCloudEmbedProps {
  url: string;
  height?: number;
  className?: string;
}

export function SoundCloudEmbed({ url, height = 166, className = "" }: SoundCloudEmbedProps) {
  // Extract track/playlist ID from SoundCloud URL
  const getSoundCloudEmbedUrl = (soundcloudUrl: string) => {
    try {
      // Handle different SoundCloud URL formats
      let cleanUrl = soundcloudUrl;
      
      // Remove query parameters and fragments
      cleanUrl = cleanUrl.split('?')[0].split('#')[0];
      
      // Convert to embed format
      if (cleanUrl.includes('soundcloud.com/')) {
        // Convert regular SoundCloud URL to embed URL
        return `https://w.soundcloud.com/player/?url=${encodeURIComponent(cleanUrl)}&color=%23ff5500&auto_play=false&hide_related=false&show_comments=true&show_user=true&show_reposts=false&show_teaser=true`;
      }
      
      return null;
    } catch (error) {
      console.error('Error parsing SoundCloud URL:', error);
      return null;
    }
  };

  const embedUrl = getSoundCloudEmbedUrl(url);

  if (!embedUrl) {
    return (
      <div className={`bg-muted rounded-lg p-4 text-center ${className}`}>
        <p className="text-sm text-muted-foreground">
          Invalid SoundCloud URL. Please check the link format.
        </p>
        <a 
          href={url} 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-primary hover:underline text-sm mt-2 inline-block"
        >
          Open in SoundCloud →
        </a>
      </div>
    );
  }

  return (
    <div className={`rounded-lg overflow-hidden bg-muted ${className}`}>
      <iframe
        width="100%"
        height={height}
        scrolling="no"
        frameBorder="no"
        allow="autoplay"
        src={embedUrl}
        className="w-full"
        title="SoundCloud Player"
      />
    </div>
  );
}