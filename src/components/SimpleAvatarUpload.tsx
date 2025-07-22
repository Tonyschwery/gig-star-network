import { useState, useRef } from 'react';
import { Upload, X, User, Loader2, Move } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { ImagePositioner } from './ImagePositioner';

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
  const [positionerState, setPositionerState] = useState<{
    isOpen: boolean;
    imageSrc: string;
    originalFile: File;
  } | null>(null);
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

    // Open the image positioner instead of auto-processing
    const imageSrc = URL.createObjectURL(file);
    setPositionerState({
      isOpen: true,
      imageSrc,
      originalFile: file
    });
  };

  const handlePositionComplete = (croppedImageBlob: Blob) => {
    // Convert blob to file
    const croppedFile = new File([croppedImageBlob], `avatar-${Date.now()}.jpg`, {
      type: 'image/jpeg',
      lastModified: Date.now(),
    });

    // Create preview URL
    const preview = URL.createObjectURL(croppedFile);
    setPreviewUrl(preview);
    
    // Update parent component
    onFileChange(croppedFile);
    
    // Clean up
    if (positionerState) {
      URL.revokeObjectURL(positionerState.imageSrc);
      setPositionerState(null);
    }

    toast({
      title: "Image Ready",
      description: "Profile picture positioned and ready for upload",
    });
  };

  const handlePositionCancel = () => {
    if (positionerState) {
      URL.revokeObjectURL(positionerState.imageSrc);
      setPositionerState(null);
    }
  };

  const handleEditPosition = () => {
    if (previewUrl && previewUrl !== currentImage) {
      // Reopen the positioner with the current preview
      setPositionerState({
        isOpen: true,
        imageSrc: previewUrl,
        originalFile: new File([], 'current-image.jpg') // Placeholder
      });
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
              <Move className="h-3 w-3 mr-1" />
              Adjust Position
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
                Drag & drop or click to browse
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Position your face perfectly • JPG, PNG • Max 10MB
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Image Positioner Dialog */}
      {positionerState && (
        <ImagePositioner
          src={positionerState.imageSrc}
          isOpen={positionerState.isOpen}
          onPositionComplete={handlePositionComplete}
          onCancel={handlePositionCancel}
        />
      )}
    </div>
  );
}