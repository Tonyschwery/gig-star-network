import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Move, Check, X } from 'lucide-react';

interface ImagePositionerProps {
  src: string;
  isOpen: boolean;
  onPositionComplete: (croppedImageBlob: Blob) => void;
  onCancel: () => void;
}

export function ImagePositioner({ src, isOpen, onPositionComplete, onCancel }: ImagePositionerProps) {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const containerSize = 300; // Fixed container size

  useEffect(() => {
    if (isOpen && imageRef.current) {
      const img = imageRef.current;
      console.log('ImagePositioner: Setting up image', { src, naturalWidth: img.naturalWidth, naturalHeight: img.naturalHeight });
      
      const onLoad = () => {
        console.log('ImagePositioner: Image loaded', { naturalWidth: img.naturalWidth, naturalHeight: img.naturalHeight });
        
        // Calculate the scale to fit the image in the container
        const scale = Math.max(containerSize / img.naturalWidth, containerSize / img.naturalHeight);
        const scaledWidth = img.naturalWidth * scale;
        const scaledHeight = img.naturalHeight * scale;
        
        console.log('ImagePositioner: Calculated dimensions', { scale, scaledWidth, scaledHeight, containerSize });
        
        setImageSize({ width: scaledWidth, height: scaledHeight });
        
        // Center the image initially
        const centerX = (containerSize - scaledWidth) / 2;
        const centerY = (containerSize - scaledHeight) / 2;
        console.log('ImagePositioner: Setting position', { centerX, centerY });
        setPosition({ x: centerX, y: centerY });
      };

      if (img.complete && img.naturalWidth > 0) {
        console.log('ImagePositioner: Image already loaded');
        onLoad();
      } else {
        console.log('ImagePositioner: Waiting for image to load');
        img.addEventListener('load', onLoad);
        img.addEventListener('error', (e) => {
          console.error('ImagePositioner: Image failed to load', e);
        });
        return () => {
          img.removeEventListener('load', onLoad);
          img.removeEventListener('error', () => {});
        };
      }
    }
  }, [isOpen, src]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;

    const newX = e.clientX - dragStart.x;
    const newY = e.clientY - dragStart.y;

    // Constrain the movement so the image can't be moved too far
    const maxX = Math.max(0, containerSize - imageSize.width);
    const maxY = Math.max(0, containerSize - imageSize.height);
    const minX = Math.min(0, containerSize - imageSize.width);
    const minY = Math.min(0, containerSize - imageSize.height);

    setPosition({
      x: Math.max(minX, Math.min(maxX, newX)),
      y: Math.max(minY, Math.min(maxY, newY))
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const generateCroppedImage = (): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const canvas = canvasRef.current;
      const img = imageRef.current;
      
      if (!canvas || !img) {
        reject(new Error('Canvas or image not available'));
        return;
      }

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas context not available'));
        return;
      }

      // Set canvas size for the output
      const outputSize = 400;
      canvas.width = outputSize;
      canvas.height = outputSize;

      // Calculate the scale factor between display and actual image
      const scaleX = img.naturalWidth / imageSize.width;
      const scaleY = img.naturalHeight / imageSize.height;

      // Calculate source coordinates on the original image
      const sourceX = -position.x * scaleX;
      const sourceY = -position.y * scaleY;
      const sourceSize = containerSize * Math.max(scaleX, scaleY);

      // Clear canvas and create circular clipping path
      ctx.clearRect(0, 0, outputSize, outputSize);
      ctx.beginPath();
      ctx.arc(outputSize / 2, outputSize / 2, outputSize / 2, 0, Math.PI * 2);
      ctx.clip();

      // Draw the positioned image
      ctx.drawImage(
        img,
        sourceX,
        sourceY,
        sourceSize,
        sourceSize,
        0,
        0,
        outputSize,
        outputSize
      );

      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to create blob'));
          }
        },
        'image/jpeg',
        0.9
      );
    });
  };

  const handleApply = async () => {
    try {
      const croppedBlob = await generateCroppedImage();
      onPositionComplete(croppedBlob);
    } catch (error) {
      console.error('Error generating cropped image:', error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onCancel}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Move className="h-5 w-5 mr-2" />
            Position Your Photo
          </DialogTitle>
          <DialogDescription>
            Drag the image to position your face in the center of the circle.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          
          {/* Image positioning area */}
          <div className="flex justify-center">
            <div
              ref={containerRef}
              className="relative overflow-hidden rounded-full border-4 border-primary/20 cursor-move bg-muted/20"
              style={{ 
                width: containerSize, 
                height: containerSize
              }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            >
              <img
                ref={imageRef}
                src={src}
                alt="Position preview"
                className="absolute select-none pointer-events-none"
                style={{
                  width: imageSize.width || 'auto',
                  height: imageSize.height || 'auto',
                  left: position.x,
                  top: position.y,
                  transform: isDragging ? 'scale(1.02)' : 'scale(1)',
                  transition: isDragging ? 'none' : 'transform 0.2s ease',
                  objectFit: 'cover',
                  display: imageSize.width > 0 ? 'block' : 'none'
                }}
                draggable={false}
                onLoad={() => console.log('Image element loaded successfully')}
                onError={(e) => console.error('Image element failed to load:', e)}
              />
              
              {/* Center guide */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-2 h-2 bg-primary/30 rounded-full" />
              </div>
              
              {/* Drag hint */}
              {!isDragging && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="bg-black/50 text-white px-2 py-1 rounded-md text-xs animate-fade-in">
                    <Move className="h-3 w-3 inline mr-1" />
                    Drag to position
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Hidden canvas for processing */}
          <canvas ref={canvasRef} className="hidden" />

          {/* Action buttons */}
          <div className="flex space-x-2 pt-4">
            <Button variant="outline" onClick={onCancel} className="flex-1">
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button onClick={handleApply} className="flex-1">
              <Check className="h-4 w-4 mr-2" />
              Apply Position
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}