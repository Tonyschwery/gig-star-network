import { useState, useRef } from 'react';
import { Upload, X, User, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import ReactCrop, { Crop, PixelCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface SimpleAvatarUploadProps {
  currentImage?: string;
  onImageChange: (imageUrl: string | null) => void;
  onFileChange: (file: File | null) => void;
  disabled?: boolean;
}

export function SimpleAvatarUpload({ 
  currentImage, 
  onImageChange,
  onFileChange,
  disabled = false 
}: SimpleAvatarUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentImage || null);
  const [cropDialogOpen, setCropDialogOpen] = useState(false);
  const [imageToCrop, setImageToCrop] = useState<string>('');
  const [crop, setCrop] = useState<Crop>({
    unit: '%',
    width: 90,
    height: 90,
    x: 5,
    y: 5,
  });
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const imgRef = useRef<HTMLImageElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid File Type",
        description: "Please select an image file",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      toast({
        title: "File Too Large",
        description: "Please select an image under 10MB",
        variant: "destructive",
      });
      return;
    }

    // Open the crop dialog
    const imageSrc = URL.createObjectURL(file);
    setImageToCrop(imageSrc);
    setCropDialogOpen(true);
  };

  const getCroppedImg = (image: HTMLImageElement, crop: PixelCrop): Promise<Blob> => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error('No 2d context');
    }

    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;

    // Set canvas size to 400x400 for consistent avatar size
    canvas.width = 400;
    canvas.height = 400;

    ctx.imageSmoothingQuality = 'high';

    // Calculate the source coordinates
    const sourceX = crop.x * scaleX;
    const sourceY = crop.y * scaleY;
    const sourceWidth = crop.width * scaleX;
    const sourceHeight = crop.height * scaleY;

    // Draw the cropped image, scaling it to fill the 400x400 canvas
    ctx.drawImage(
      image,
      sourceX,
      sourceY,
      sourceWidth,
      sourceHeight,
      0,
      0,
      400,
      400
    );

    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Canvas is empty'));
            return;
          }
          resolve(blob);
        },
        'image/jpeg',
        0.9
      );
    });
  };

  const handleCropComplete = async () => {
    if (!imgRef.current || !completedCrop || !imageToCrop) return;

    try {
      const croppedBlob = await getCroppedImg(imgRef.current, completedCrop);
      
      // Convert blob to file
      const croppedFile = new File([croppedBlob], `avatar-${Date.now()}.jpg`, {
        type: 'image/jpeg',
        lastModified: Date.now(),
      });

      // Create preview URL
      const preview = URL.createObjectURL(croppedFile);
      setPreviewUrl(preview);
      
      // Update parent component
      onFileChange(croppedFile);
      
      // Clean up
      URL.revokeObjectURL(imageToCrop);
      setCropDialogOpen(false);
      setImageToCrop('');

      toast({
        title: "Image Ready",
        description: "Profile picture cropped and ready for upload",
      });
    } catch (error) {
      console.error('Error cropping image:', error);
      toast({
        title: "Error",
        description: "Failed to crop image. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleCropCancel = () => {
    if (imageToCrop) {
      URL.revokeObjectURL(imageToCrop);
    }
    setCropDialogOpen(false);
    setImageToCrop('');
  };

  const handleEditPosition = () => {
    if (previewUrl && previewUrl !== currentImage) {
      setImageToCrop(previewUrl);
      setCropDialogOpen(true);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    
    if (disabled) return;
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
    // Reset input
    e.target.value = '';
  };

  const removeImage = () => {
    if (previewUrl && previewUrl !== currentImage) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    onImageChange(null);
    onFileChange(null);
    
    toast({
      title: "Image Removed",
      description: "Profile picture has been removed",
    });
  };

  return (
    <div className="space-y-4">
      {/* Current/Preview Image */}
      {previewUrl && (
        <div className="flex flex-col items-center space-y-3">
          <div className="relative">
            <Avatar className="w-32 h-32">
              <AvatarImage src={previewUrl} alt="Profile preview" />
              <AvatarFallback>
                <User className="w-16 h-16" />
              </AvatarFallback>
            </Avatar>
            
            {!disabled && (
              <button
                type="button"
                onClick={removeImage}
                className="absolute -top-2 -right-2 w-6 h-6 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center hover:bg-destructive/80 transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
          
          {/* Edit position button */}
          {!disabled && previewUrl !== currentImage && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleEditPosition}
              className="text-xs"
            >
              Adjust Crop
            </Button>
          )}
        </div>
      )}

      {/* Upload Area */}
      {!previewUrl && (
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            dragOver 
              ? 'border-primary bg-primary/5' 
              : 'border-muted-foreground/25 hover:border-primary/50'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          onDrop={handleDrop}
          onDragOver={(e) => { e.preventDefault(); if (!disabled) setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onClick={() => !disabled && fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileSelect}
            disabled={disabled}
          />
          
          <div className="flex flex-col items-center space-y-4">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center">
              <Upload className="h-8 w-8 text-muted-foreground" />
            </div>
            
            <div>
              <p className="font-medium text-lg">Upload Profile Picture</p>
              <p className="text-sm text-muted-foreground">
                Drag & drop or click to select
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                📸 You'll be able to crop and adjust your photo perfectly before saving
              </p>
              <p className="text-xs text-muted-foreground">
                JPG, PNG • Max 10MB
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Crop Dialog */}
      <Dialog open={cropDialogOpen} onOpenChange={handleCropCancel}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Crop Your Profile Picture</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="bg-primary/10 p-3 rounded-lg border border-primary/20">
              <p className="text-sm font-medium mb-1">How to crop:</p>
              <ul className="text-xs text-muted-foreground space-y-1 ml-4 list-disc">
                <li>Drag the corners to resize the crop area</li>
                <li>Click and drag inside to move the crop position</li>
                <li>Your photo will be cropped to a perfect square</li>
              </ul>
            </div>
            
            {imageToCrop && (
              <div className="flex justify-center">
                <ReactCrop
                  crop={crop}
                  onChange={(c) => setCrop(c)}
                  onComplete={(c) => setCompletedCrop(c)}
                  aspect={1}
                  circularCrop
                >
                  <img
                    ref={imgRef}
                    src={imageToCrop}
                    alt="Crop preview"
                    style={{ maxHeight: '400px', maxWidth: '100%' }}
                  />
                </ReactCrop>
              </div>
            )}

            <div className="flex space-x-2 pt-4">
              <Button variant="outline" onClick={handleCropCancel} className="flex-1">
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button onClick={handleCropComplete} className="flex-1">
                Apply Crop
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}