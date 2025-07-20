import { useState, useEffect, useRef } from 'react';
import WaveSurfer from 'wavesurfer.js';
import { Play, Pause, Volume2, ExternalLink, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';

interface AudioWaveformProps {
  url: string;
  title?: string;
}

export function AudioWaveform({ url, title = 'Audio Track' }: AudioWaveformProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const wavesurfer = useRef<WaveSurfer | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState([50]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    try {
      wavesurfer.current = WaveSurfer.create({
        container: containerRef.current,
        waveColor: 'hsl(var(--muted-foreground))',
        progressColor: 'hsl(var(--brand-primary))',
        cursorColor: 'hsl(var(--brand-accent))',
        barWidth: 2,
        barRadius: 3,
        height: 60,
        normalize: true,
        backend: 'WebAudio',
        mediaControls: false,
      });

      wavesurfer.current.on('ready', () => {
        setIsLoading(false);
        setDuration(wavesurfer.current?.getDuration() || 0);
      });

      wavesurfer.current.on('play', () => setIsPlaying(true));
      wavesurfer.current.on('pause', () => setIsPlaying(false));
      
      wavesurfer.current.on('timeupdate', () => {
        setCurrentTime(wavesurfer.current?.getCurrentTime() || 0);
      });

      wavesurfer.current.on('error', (err) => {
        console.error('WaveSurfer error:', err);
        setError('Failed to load audio');
        setIsLoading(false);
      });

      // Load the audio
      wavesurfer.current.load(url);

    } catch (err) {
      console.error('Failed to initialize WaveSurfer:', err);
      setError('Failed to initialize audio player');
      setIsLoading(false);
    }

    return () => {
      wavesurfer.current?.destroy();
    };
  }, [url]);

  const handlePlayPause = () => {
    if (wavesurfer.current) {
      wavesurfer.current.playPause();
    }
  };

  const handleVolumeChange = (value: number[]) => {
    setVolume(value);
    if (wavesurfer.current) {
      wavesurfer.current.setVolume(value[0] / 100);
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  if (error) {
    return (
      <div className="bg-muted rounded-lg p-6 text-center">
        <div className="text-muted-foreground mb-4">
          <Volume2 className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p className="text-sm">{error}</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => window.open(url, '_blank')}
        >
          <ExternalLink className="h-4 w-4 mr-2" />
          Open Original
        </Button>
      </div>
    );
  }

  return (
    <div className="bg-card border rounded-lg p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center">
            <Volume2 className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="font-medium">{title}</h3>
            <p className="text-sm text-muted-foreground">SoundCloud Track</p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => window.open(url, '_blank')}
        >
          <ExternalLink className="h-4 w-4 mr-2" />
          Open
        </Button>
      </div>

      {/* Waveform */}
      <div className="relative">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted rounded">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        )}
        <div ref={containerRef} className="w-full" />
      </div>

      {/* Controls */}
      <div className="flex items-center space-x-4">
        {/* Play/Pause */}
        <Button
          variant="outline"
          size="sm"
          onClick={handlePlayPause}
          disabled={isLoading}
          className="w-10 h-10 p-0"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : isPlaying ? (
            <Pause className="h-4 w-4" />
          ) : (
            <Play className="h-4 w-4" />
          )}
        </Button>

        {/* Time display */}
        <div className="text-sm text-muted-foreground min-w-[80px]">
          {formatTime(currentTime)} / {formatTime(duration)}
        </div>

        {/* Volume control */}
        <div className="flex items-center space-x-2 flex-1 max-w-[120px]">
          <Volume2 className="h-4 w-4 text-muted-foreground" />
          <Slider
            value={volume}
            onValueChange={handleVolumeChange}
            max={100}
            step={1}
            className="flex-1"
          />
        </div>
      </div>
    </div>
  );
}