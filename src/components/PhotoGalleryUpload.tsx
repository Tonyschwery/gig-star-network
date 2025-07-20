import { useState, useRef } from 'react';
import { Upload, X, ImageIcon, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { ImageCropper } from './ImageCropper';

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
  const [cropperState, setCropperState] = useState<{
    isOpen: boolean;
    imageSrc: string;
    originalFile: File;
    index: number;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const uploadImage = async (processedFile: File, index: number): Promise<string | null> => {
    try {
      // Get current user ID for proper file organization
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const fileExt = 'jpg'; // Always use jpg for consistency
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
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
      toast({
        title: "Upload Error",
        description: `Failed to upload image ${index + 1}`,
        variant: "destructive",
      });
      return null;
    }
  };

  const handleCropComplete = async (croppedImageBlob: Blob) => {
    if (!cropperState) return;

    try {
      // Convert blob to file
      const croppedFile = new File([croppedImageBlob], `cropped-${cropperState.originalFile.name}`, {
        type: 'image/jpeg',
        lastModified: Date.now(),
      });

      // Set uploading state
      setUploading([true]);

      // Upload the cropped image
      const uploadedUrl = await uploadImage(croppedFile, 0);
      
      if (uploadedUrl) {
        const newImages = [...currentImages, uploadedUrl];
        onImagesChange(newImages);
        
        toast({
          title: "Upload Successful",
          description: "Image cropped and uploaded successfully",
        });
      }

      // Reset states
      setUploading([]);
      setCropperState(null);
      
      // Clean up object URL
      URL.revokeObjectURL(cropperState.imageSrc);
    } catch (error) {
      console.error('Error processing cropped image:', error);
      setUploading([]);
      toast({
        title: "Upload Failed",
        description: "Failed to process and upload the cropped image",
        variant: "destructive",
      });
    }
  };

  const handleCropCancel = () => {
    if (cropperState) {
      URL.revokeObjectURL(cropperState.imageSrc);
      setCropperState(null);
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
      
      if (file.size > 10 * 1024 * 1024) { // 10MB original file limit
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

    // Process first file for cropping
    if (validFiles.length > 0) {
      const file = validFiles[0];
      const imageSrc = URL.createObjectURL(file);
      setCropperState({
        isOpen: true,
        imageSrc,
        originalFile: file,
        index: 0
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
            accept="image/*"
            className="hidden"
            onChange={(e) => e.target.files && handleFiles(e.target.files)}
          />
          
          <div className="flex flex-col items-center space-y-2">
            <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center">
              <Upload className="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
              <p className="font-medium">Upload & Crop Photos</p>
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
                Max {maxImages} photos • Auto-cropped to perfect squares • JPG, PNG
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

      {/* Image Cropper Dialog */}
      {cropperState && (
        <ImageCropper
          src={cropperState.imageSrc}
          isOpen={cropperState.isOpen}
          onCropComplete={handleCropComplete}
          onCancel={handleCropCancel}
        />
      )}
    </div>
  );
}