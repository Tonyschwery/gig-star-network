import { useState, useRef } from 'react';
import ReactCrop, { Crop, PixelCrop } from 'react-image-crop';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Crop as CropIcon, RotateCcw } from 'lucide-react';
import 'react-image-crop/dist/ReactCrop.css';

interface ImageCropperProps {
  src: string;
  onCropComplete: (croppedImageBlob: Blob) => void;
  onCancel: () => void;
  isOpen: boolean;
}

export function ImageCropper({ src, onCropComplete, onCancel, isOpen }: ImageCropperProps) {
  const [crop, setCrop] = useState<Crop>({
    unit: '%',
    x: 0,
    y: 0,
    width: 100,
    height: 100,
  });
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const imgRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const onImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget;
    
    // Create a centered square crop
    const size = Math.min(width, height);
    const x = (width - size) / 2;
    const y = (height - size) / 2;
    
    const newCrop: Crop = {
      unit: 'px',
      x,
      y,
      width: size,
      height: size,
    };
    
    setCrop(newCrop);
  };

  const getCroppedImg = async (): Promise<Blob> => {
    const image = imgRef.current;
    const canvas = canvasRef.current;
    
    if (!image || !canvas || !completedCrop) {
      throw new Error('Canvas or image not found');
    }

    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;

    // Set canvas size to desired output size (always square)
    const outputSize = 800; // Fixed square size for consistency
    canvas.width = outputSize;
    canvas.height = outputSize;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('No 2d context');
    }

    // Set image smoothing for better quality
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Calculate source dimensions
    const sourceX = completedCrop.x * scaleX;
    const sourceY = completedCrop.y * scaleY;
    const sourceWidth = completedCrop.width * scaleX;
    const sourceHeight = completedCrop.height * scaleY;

    // Draw the cropped image onto canvas, scaling to fit the output size
    ctx.drawImage(
      image,
      sourceX,
      sourceY,
      sourceWidth,
      sourceHeight,
      0,
      0,
      outputSize,
      outputSize
    );

    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to create blob'));
          }
        },
        'image/jpeg',
        0.9 // High quality
      );
    });
  };

  const handleCropComplete = async () => {
    try {
      const croppedImageBlob = await getCroppedImg();
      onCropComplete(croppedImageBlob);
    } catch (error) {
      console.error('Error cropping image:', error);
    }
  };

  const resetCrop = () => {
    if (imgRef.current) {
      const { width, height } = imgRef.current;
      const size = Math.min(width, height);
      const x = (width - size) / 2;
      const y = (height - size) / 2;
      
      setCrop({
        unit: 'px',
        x,
        y,
        width: size,
        height: size,
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onCancel}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <CropIcon className="h-5 w-5 mr-2" />
            Crop Your Image
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Adjust the crop area to create a perfect square image for your gallery. 
            The image will be optimized for the best display quality.
          </p>
          
          <div className="relative max-h-[500px] overflow-auto border rounded-lg">
            <ReactCrop
              crop={crop}
              onChange={(c) => setCrop(c)}
              onComplete={(c) => setCompletedCrop(c)}
              aspect={1} // Force square aspect ratio
              minWidth={100}
              minHeight={100}
            >
              <img
                ref={imgRef}
                src={src}
                onLoad={onImageLoad}
                alt="Crop preview"
                className="max-w-full h-auto"
              />
            </ReactCrop>
          </div>

          {/* Hidden canvas for processing */}
          <canvas ref={canvasRef} className="hidden" />

          <div className="flex justify-between items-center pt-4">
            <Button
              variant="outline"
              onClick={resetCrop}
              className="flex items-center"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset Crop
            </Button>
            
            <div className="flex space-x-2">
              <Button variant="outline" onClick={onCancel}>
                Cancel
              </Button>
              <Button 
                onClick={handleCropComplete}
                disabled={!completedCrop}
                className="bg-brand-primary hover:bg-brand-primary-dark"
              >
                Apply Crop
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}