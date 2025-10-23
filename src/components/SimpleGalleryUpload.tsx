import { useState, useRef } from 'react';
import { Upload, X, ImageIcon, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useProStatus } from '@/contexts/ProStatusContext';

interface SimpleGalleryUploadProps {
  currentImages: string[];
  onImagesChange: (images: string[]) => void;
  maxImages?: number;
  disabled?: boolean;
}

export function SimpleGalleryUpload({ 
  currentImages, 
  onImagesChange, 
  maxImages = 5,
  disabled = false 
}: SimpleGalleryUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { toast } = useToast();
  const { isProUser } = useProStatus();

  const effectiveMaxImages = isProUser ? Math.max(maxImages, 10) : 1; // Pro users get 10, Free users get 1

  const processImageToSquare = (file: File): Promise<File> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const canvas = canvasRef.current;
      
      if (!canvas) {
        reject(new Error('Canvas not available'));
        return;
      }

      img.onload = () => {
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas context not available'));
          return;
        }

        // Set output size - square for gallery images
        const size = 800;
        canvas.width = size;
        canvas.height = size;

        // Calculate crop dimensions to center the image
        const sourceSize = Math.min(img.width, img.height);
        const sourceX = (img.width - sourceSize) / 2;
        const sourceY = (img.height - sourceSize) / 2;

        // Clear canvas and draw image centered and scaled
        ctx.clearRect(0, 0, size, size);
        ctx.drawImage(img, sourceX, sourceY, sourceSize, sourceSize, 0, 0, size, size);

        // Convert to blob and then to file
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const processedFile = new File([blob], `gallery-${Date.now()}.jpg`, {
                type: 'image/jpeg',
                lastModified: Date.now(),
              });
              resolve(processedFile);
            } else {
              reject(new Error('Failed to process image'));
            }
          },
          'image/jpeg',
          0.9
        );
      };

      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(file);
    });
  };

  const uploadImage = async (file: File): Promise<string | null> => {
    try {
      // Get current user ID for proper file organization
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Process image to square format
      const processedFile = await processImageToSquare(file);

      // Create organized file path
      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substring(2);
      const fileName = `gallery-${timestamp}-${randomId}.jpg`;
      const filePath = `${user.id}/gallery/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('talent-pictures')
        .upload(filePath, processedFile);

      if (uploadError) {
        throw uploadError;
      }

      const { data } = supabase.storage
        .from('talent-pictures')
        .getPublicUrl(filePath);

      return data.publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      throw error;
    }
  };

  const handleFiles = async (files: FileList) => {
    if (disabled) return;

    const remainingSlots = effectiveMaxImages - currentImages.length;
    const filesToProcess = Array.from(files).slice(0, remainingSlots);
    
    if (files.length > remainingSlots) {
      toast({
        title: "Too Many Images",
        description: `You can only upload ${remainingSlots} more image(s). ${isProUser ? 'Pro maximum is 10 photos' : 'Free users are limited to 1 photo. Upgrade to Pro for up to 10 photos!'}.`,
        variant: "destructive",
      });
    }

    // Validate file types and sizes
    const validFiles = filesToProcess.filter(file => {
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Invalid File Type",
          description: `${file.name} is not an image file`,
          variant: "destructive",
        });
        return false;
      }
      
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        toast({
          title: "File Too Large",
          description: `${file.name} is too large. Please choose a smaller image.`,
          variant: "destructive",
        });
        return false;
      }
      
      return true;
    });

    if (validFiles.length === 0) return;

    setUploading(true);

    try {
      // Process and upload all valid files
      const uploadPromises = validFiles.map(file => uploadImage(file));
      const uploadedUrls = await Promise.all(uploadPromises);
      
      // Filter out any null results and add to current images
      const successfulUploads = uploadedUrls.filter(url => url !== null) as string[];
      
      if (successfulUploads.length > 0) {
        const newImages = [...currentImages, ...successfulUploads];
        onImagesChange(newImages);
        
        toast({
          title: "Upload Successful",
          description: `${successfulUploads.length} image(s) uploaded and optimized`,
        });
      }
    } catch (error) {
      console.error('Error uploading images:', error);
      toast({
        title: "Upload Failed",
        description: "Failed to upload some images. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (indexToRemove: number) => {
    if (disabled) return;
    
    const newImages = currentImages.filter((_, index) => index !== indexToRemove);
    onImagesChange(newImages);
    
    toast({
      title: "Image Removed",
      description: "Image has been removed from your gallery",
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    
    if (disabled || uploading) return;
    
    if (e.dataTransfer.files) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const canUploadMore = currentImages.length < effectiveMaxImages && !disabled;

  return (
    <div className="space-y-4">
      {/* Hidden canvas for image processing */}
      <canvas ref={canvasRef} className="hidden" />
      
      {/* Upload Area */}
      {canUploadMore && (
        <div
          className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
            dragOver 
              ? 'border-primary bg-primary/5' 
              : 'border-muted-foreground/25 hover:border-primary/50'
          } ${uploading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          onDrop={handleDrop}
          onDragOver={(e) => { e.preventDefault(); if (!uploading && !disabled) setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onClick={() => !uploading && !disabled && fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => e.target.files && handleFiles(e.target.files)}
            disabled={uploading || disabled}
          />
          
          <div className="flex flex-col items-center space-y-3">
            {uploading ? (
              <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center">
                <Upload className="h-6 w-6 text-muted-foreground" />
              </div>
            )}
            
            <div>
              <p className="font-medium">
                {uploading ? 'Processing Images...' : 'Add Gallery Photos'}
              </p>
              <p className="text-sm text-muted-foreground">
                {uploading 
                  ? 'Optimizing your photos for perfect display...'
                  : 'Drag & drop or click to browse files'
                }
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Auto-cropped to squares • Multiple files OK • JPG, PNG • Max 10MB each
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Gallery Grid */}
      {currentImages.length > 0 && (
        <div className="w-full max-w-full overflow-hidden">
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-2 sm:gap-4 w-full">
            {currentImages.map((imageUrl, index) => (
              <div key={index} className="relative aspect-square group w-full max-w-full overflow-hidden">
                <img
                  src={imageUrl}
                  alt={`Gallery image ${index + 1}`}
                  className="w-full h-full object-cover rounded-lg"
                  loading="lazy"
                />
                {!disabled && (
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    className="absolute top-2 right-2 w-6 h-6 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Progress indicator */}
      {uploading && (
        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            Processing and uploading your images...
          </p>
        </div>
      )}

      {/* Info */}
      <div className="text-sm text-muted-foreground">
        {currentImages.length} of {effectiveMaxImages} photos uploaded
        {currentImages.length >= effectiveMaxImages && (
          <span className="ml-2 text-primary">• Gallery full</span>
        )}
      </div>
    </div>
  );
}