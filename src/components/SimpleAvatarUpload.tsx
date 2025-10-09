import { useState, useRef } from 'react';
import { Upload, X, User, ZoomIn, ZoomOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import AvatarEditor from 'react-avatar-editor';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Slider } from '@/components/ui/slider';

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
  const [imageToCrop, setImageToCrop] = useState<File | null>(null);
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const editorRef = useRef<AvatarEditor>(null);
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
    setImageToCrop(file);
    setScale(1);
    setRotation(0);
    setCropDialogOpen(true);
  };

  const handleCropComplete = async () => {
    if (!editorRef.current || !imageToCrop) return;

    try {
      // Get the canvas with the cropped image
      const canvas = editorRef.current.getImageScaledToCanvas();
      
      // Convert canvas to blob
      canvas.toBlob(async (blob) => {
        if (!blob) {
          toast({
            title: "Error",
            description: "Failed to crop image. Please try again.",
            variant: "destructive",
          });
          return;
        }

        // Convert blob to file
        const croppedFile = new File([blob], `avatar-${Date.now()}.jpg`, {
          type: 'image/jpeg',
          lastModified: Date.now(),
        });

        // Create preview URL
        const preview = URL.createObjectURL(croppedFile);
        setPreviewUrl(preview);
        
        // Update parent component
        onFileChange(croppedFile);
        
        // Clean up
        setCropDialogOpen(false);
        setImageToCrop(null);

        toast({
          title: "Image Ready",
          description: "Profile picture cropped and ready for upload",
        });
      }, 'image/jpeg', 0.9);
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
    setCropDialogOpen(false);
    setImageToCrop(null);
    setScale(1);
    setRotation(0);
  };

  const handleEditPosition = () => {
    if (imageToCrop) {
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
          {!disabled && imageToCrop && (
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
            <DialogTitle>Adjust Your Profile Picture</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            <div className="bg-primary/10 p-3 rounded-lg border border-primary/20">
              <p className="text-sm font-medium mb-1">💡 How to adjust:</p>
              <ul className="text-xs text-muted-foreground space-y-1 ml-4 list-disc">
                <li><strong>Drag</strong> the image to reposition it inside the circle</li>
                <li><strong>Pinch</strong> on mobile or use the zoom slider below</li>
                <li>Your photo will be perfectly circular</li>
              </ul>
            </div>
            
            {imageToCrop && (
              <div className="flex flex-col items-center space-y-4">
                <div className="border-4 border-primary/20 rounded-full overflow-hidden">
                  <AvatarEditor
                    ref={editorRef}
                    image={imageToCrop}
                    width={300}
                    height={300}
                    border={0}
                    borderRadius={150}
                    color={[255, 255, 255, 0.6]}
                    scale={scale}
                    rotate={rotation}
                    className="cursor-move touch-pan-x touch-pan-y"
                  />
                </div>

                {/* Zoom Controls */}
                <div className="w-full max-w-md space-y-2">
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <ZoomOut className="h-4 w-4" />
                      Zoom
                    </span>
                    <span className="flex items-center gap-1">
                      <ZoomIn className="h-4 w-4" />
                    </span>
                  </div>
                  <Slider
                    value={[scale]}
                    onValueChange={(values) => setScale(values[0])}
                    min={1}
                    max={3}
                    step={0.01}
                    className="w-full"
                  />
                </div>
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