import { useState, useRef } from 'react';
import { Upload, X, ImageIcon, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface PhotoGalleryUploadProps {
  currentImages: string[];
  onImagesChange: (images: string[]) => void;
  maxImages?: number;
  maxSizeKB?: number;
}

export function PhotoGalleryUpload({ 
  currentImages, 
  onImagesChange, 
  maxImages = 5,
  maxSizeKB = 500 // 500KB max per image
}: PhotoGalleryUploadProps) {
  const [uploading, setUploading] = useState<boolean[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const compressImage = (file: File, maxSizeKB: number): Promise<File> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      const img = new Image();
      
      img.onload = () => {
        // Calculate new dimensions maintaining aspect ratio
        const maxDimension = 800; // Max width/height
        let { width, height } = img;
        
        if (width > height) {
          if (width > maxDimension) {
            height = (height * maxDimension) / width;
            width = maxDimension;
          }
        } else {
          if (height > maxDimension) {
            width = (width * maxDimension) / height;
            height = maxDimension;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        
        // Draw and compress
        ctx.drawImage(img, 0, 0, width, height);
        
        const tryCompress = (quality: number) => {
          canvas.toBlob((blob) => {
            if (blob && blob.size <= maxSizeKB * 1024) {
              const compressedFile = new File([blob], file.name, {
                type: 'image/jpeg',
                lastModified: Date.now(),
              });
              resolve(compressedFile);
            } else if (quality > 0.1) {
              tryCompress(quality - 0.1);
            } else {
              // If we can't compress enough, return the original
              resolve(file);
            }
          }, 'image/jpeg', quality);
        };
        
        tryCompress(0.8);
      };
      
      img.src = URL.createObjectURL(file);
    });
  };

  const uploadImage = async (file: File, index: number): Promise<string | null> => {
    try {
      // Get current user ID for proper file organization
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Compress the image first
      const compressedFile = await compressImage(file, maxSizeKB);
      
      const fileExt = compressedFile.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `${user.id}/gallery/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('talent-pictures')
        .upload(filePath, compressedFile);

      if (uploadError) {
        throw uploadError;
      }

      const { data } = supabase.storage
        .from('talent-pictures')
        .getPublicUrl(filePath);

      return data.publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      toast({
        title: "Upload Error",
        description: `Failed to upload image ${index + 1}`,
        variant: "destructive",
      });
      return null;
    }
  };

  const handleFiles = async (files: FileList) => {
    const remainingSlots = maxImages - currentImages.length;
    const filesToProcess = Array.from(files).slice(0, remainingSlots);
    
    if (files.length > remainingSlots) {
      toast({
        title: "Too Many Images",
        description: `You can only upload ${remainingSlots} more image(s). Maximum is ${maxImages} photos.`,
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
      
      if (file.size > 5 * 1024 * 1024) { // 5MB original file limit
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

    // Initialize uploading states
    setUploading(prev => [...prev, ...new Array(validFiles.length).fill(true)]);

    // Upload files
    const uploadPromises = validFiles.map((file, index) => uploadImage(file, index));
    const uploadedUrls = await Promise.all(uploadPromises);
    
    // Filter out failed uploads and update images
    const successfulUploads = uploadedUrls.filter((url): url is string => url !== null);
    const newImages = [...currentImages, ...successfulUploads];
    onImagesChange(newImages);

    // Reset uploading states
    setUploading([]);

    if (successfulUploads.length > 0) {
      toast({
        title: "Upload Successful",
        description: `${successfulUploads.length} image(s) uploaded successfully`,
      });
    }
  };

  const removeImage = (indexToRemove: number) => {
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
    
    if (e.dataTransfer.files) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const canUploadMore = currentImages.length < maxImages;

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      {canUploadMore && (
        <div
          className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
            dragOver 
              ? 'border-brand-primary bg-brand-primary/5' 
              : 'border-muted-foreground/25 hover:border-brand-primary/50'
          }`}
          onDrop={handleDrop}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            className="hidden"
            onChange={(e) => e.target.files && handleFiles(e.target.files)}
          />
          
          <div className="flex flex-col items-center space-y-2">
            <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center">
              <Upload className="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
              <p className="font-medium">Upload Photos</p>
              <p className="text-sm text-muted-foreground">
                Drag & drop or{' '}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-brand-primary hover:underline"
                >
                  browse files
                </button>
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Max {maxImages} photos • Up to {maxSizeKB}KB each • JPG, PNG
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Gallery Grid */}
      {(currentImages.length > 0 || uploading.length > 0) && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {currentImages.map((imageUrl, index) => (
            <div key={index} className="relative aspect-square group">
              <img
                src={imageUrl}
                alt={`Gallery image ${index + 1}`}
                className="w-full h-full object-cover rounded-lg"
              />
              <button
                type="button"
                onClick={() => removeImage(index)}
                className="absolute top-2 right-2 w-6 h-6 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
          
          {/* Uploading placeholders */}
          {uploading.map((_, index) => (
            <div key={`uploading-${index}`} className="relative aspect-square">
              <div className="w-full h-full bg-muted rounded-lg flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Info */}
      <div className="text-sm text-muted-foreground">
        {currentImages.length} of {maxImages} photos uploaded
        {currentImages.length >= maxImages && (
          <span className="ml-2 text-brand-primary">• Gallery full</span>
        )}
      </div>
    </div>
  );
}