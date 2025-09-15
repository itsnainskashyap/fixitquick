import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useImageUpload, type UploadedImage } from '@/hooks/useImageUpload';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { 
  Camera, 
  Upload, 
  Crop,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Check,
  X,
  Loader2,
  User,
  Edit2,
  Trash2,
  Download
} from 'lucide-react';

export interface AvatarUploadProps {
  currentAvatar?: string;
  userName?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  allowCrop?: boolean;
  allowRemove?: boolean;
  endpoint?: string;
  className?: string;
  disabled?: boolean;
  onUpload?: (image: UploadedImage) => void;
  onRemove?: () => void;
  onError?: (error: string) => void;
}

interface CropSettings {
  x: number;
  y: number;
  width: number;
  height: number;
  scale: number;
  rotation: number;
}

// Avatar size configurations
const sizeConfig = {
  sm: { size: 'w-16 h-16', text: 'text-lg' },
  md: { size: 'w-24 h-24', text: 'text-2xl' },
  lg: { size: 'w-32 h-32', text: 'text-4xl' },
  xl: { size: 'w-40 h-40', text: 'text-5xl' },
};

// Generate initials from name
function getInitials(name?: string): string {
  if (!name) return 'U';
  return name
    .split(' ')
    .map(word => word.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

// Crop and process image
function cropImage(
  imageSrc: string,
  crop: CropSettings,
  outputSize: number = 300
): Promise<File> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const image = new Image();

    image.onload = () => {
      // Set canvas size
      canvas.width = outputSize;
      canvas.height = outputSize;

      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }

      // Calculate crop dimensions
      const sourceX = crop.x * image.width;
      const sourceY = crop.y * image.height;
      const sourceWidth = crop.width * image.width;
      const sourceHeight = crop.height * image.height;

      // Apply transformations
      ctx.save();
      
      // Move to center for rotation
      ctx.translate(outputSize / 2, outputSize / 2);
      
      // Apply rotation
      if (crop.rotation) {
        ctx.rotate((crop.rotation * Math.PI) / 180);
      }
      
      // Apply scale
      ctx.scale(crop.scale, crop.scale);
      
      // Draw cropped image
      ctx.drawImage(
        image,
        sourceX, sourceY, sourceWidth, sourceHeight,
        -outputSize / 2, -outputSize / 2, outputSize, outputSize
      );
      
      ctx.restore();

      // Convert to blob
      canvas.toBlob(
        (blob) => {
          if (blob) {
            const file = new File([blob], 'avatar.jpg', {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });
            resolve(file);
          } else {
            reject(new Error('Could not create blob'));
          }
        },
        'image/jpeg',
        0.9
      );
    };

    image.onerror = () => reject(new Error('Could not load image'));
    image.src = imageSrc;
  });
}

export default function AvatarUpload({
  currentAvatar,
  userName,
  size = 'lg',
  allowCrop = true,
  allowRemove = true,
  endpoint = '/api/v1/users/me/avatar',
  className,
  disabled = false,
  onUpload,
  onRemove,
  onError,
}: AvatarUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isHovering, setIsHovering] = useState(false);
  const [cropDialogOpen, setCropDialogOpen] = useState(false);
  const [imageToProcess, setImageToProcess] = useState<string | null>(null);
  const [cropSettings, setCropSettings] = useState<CropSettings>({
    x: 0.1,
    y: 0.1,
    width: 0.8,
    height: 0.8,
    scale: 1,
    rotation: 0,
  });
  const [isProcessing, setIsProcessing] = useState(false);

  const config = sizeConfig[size];

  const {
    handleFiles,
    uploadProgress,
    isUploading,
    isError,
    error,
    reset
  } = useImageUpload({
    maxFiles: 1,
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
    maxSize: 5 * 1024 * 1024, // 5MB
    compress: true,
    quality: 0.9,
    maxWidth: 800,
    maxHeight: 800,
    endpoint,
    documentType: 'avatar',
    onComplete: (images) => {
      if (images.length > 0) {
        onUpload?.(images[0]);
      }
    },
    onError: (errorMsg) => {
      onError?.(errorMsg);
    }
  });

  // Handle file selection
  const handleFileSelect = useCallback((files: FileList | File[]) => {
    const file = files[0];
    if (!file) return;

    // Create preview URL for cropping
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      if (allowCrop) {
        setImageToProcess(result);
        setCropDialogOpen(true);
      } else {
        // Upload directly without cropping
        handleFiles([file]);
      }
    };
    reader.readAsDataURL(file);
  }, [allowCrop, handleFiles]);

  // Open file browser
  const openFileBrowser = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  // Handle crop and upload
  const handleCropAndUpload = useCallback(async () => {
    if (!imageToProcess) return;

    setIsProcessing(true);
    try {
      const croppedFile = await cropImage(imageToProcess, cropSettings);
      await handleFiles([croppedFile]);
      setCropDialogOpen(false);
      setImageToProcess(null);
    } catch (err) {
      onError?.('Failed to process image');
      console.error('Crop error:', err);
    } finally {
      setIsProcessing(false);
    }
  }, [imageToProcess, cropSettings, handleFiles, onError]);

  // Cancel crop
  const cancelCrop = useCallback(() => {
    setCropDialogOpen(false);
    setImageToProcess(null);
    setCropSettings({
      x: 0.1,
      y: 0.1,
      width: 0.8,
      height: 0.8,
      scale: 1,
      rotation: 0,
    });
  }, []);

  // Remove avatar
  const handleRemove = useCallback(() => {
    onRemove?.();
  }, [onRemove]);

  // Reset rotation
  const resetRotation = useCallback(() => {
    setCropSettings(prev => ({ ...prev, rotation: 0 }));
  }, []);

  return (
    <div className={cn('flex flex-col items-center space-y-4', className)}>
      {/* Avatar Display */}
      <div 
        className="relative group cursor-pointer"
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
        onClick={disabled ? undefined : openFileBrowser}
      >
        <Avatar className={cn(config.size, 'transition-all duration-200', {
          'ring-4 ring-primary/20': isHovering && !disabled,
          'opacity-50': disabled,
        })}>
          <AvatarImage src={currentAvatar} alt={userName} />
          <AvatarFallback className={config.text}>
            {getInitials(userName)}
          </AvatarFallback>
        </Avatar>

        {/* Upload Overlay */}
        <AnimatePresence>
          {(isHovering || isUploading) && !disabled && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className={cn(
                'absolute inset-0 rounded-full bg-black/60 flex items-center justify-center',
                config.size
              )}
            >
              {isUploading ? (
                <div className="text-center text-white">
                  <Loader2 className="h-6 w-6 mx-auto animate-spin mb-1" />
                  <div className="text-xs">Uploading...</div>
                </div>
              ) : (
                <div className="text-center text-white">
                  <Camera className="h-6 w-6 mx-auto mb-1" />
                  <div className="text-xs">Change</div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Upload Progress */}
        {isUploading && (
          <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 w-full max-w-32">
            <Progress value={uploadProgress.percentage} className="h-1" />
          </div>
        )}

        {/* Status Badge */}
        {isError && (
          <Badge variant="destructive" className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 text-xs">
            Failed
          </Badge>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={openFileBrowser}
          disabled={disabled || isUploading}
          data-testid="avatar-upload-button"
        >
          <Upload className="h-4 w-4 mr-2" />
          {currentAvatar ? 'Change' : 'Upload'}
        </Button>

        {currentAvatar && allowRemove && (
          <Button
            size="sm"
            variant="outline"
            onClick={handleRemove}
            disabled={disabled || isUploading}
            className="text-destructive hover:text-destructive"
            data-testid="avatar-remove-button"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Remove
          </Button>
        )}

        {isError && (
          <Button
            size="sm"
            variant="outline"
            onClick={reset}
            className="text-orange-600 hover:text-orange-600"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        )}
      </div>

      {/* Error Message */}
      {isError && error && (
        <div className="text-sm text-destructive text-center max-w-xs">
          {error}
        </div>
      )}

      {/* File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={(e) => e.target.files && handleFileSelect(e.target.files)}
        className="hidden"
        disabled={disabled}
      />

      {/* Crop Dialog */}
      <Dialog open={cropDialogOpen} onOpenChange={setCropDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Crop Your Avatar</DialogTitle>
          </DialogHeader>

          {imageToProcess && (
            <div className="space-y-6">
              {/* Crop Preview */}
              <div className="relative mx-auto w-80 h-80 border rounded-lg overflow-hidden bg-muted">
                <img
                  src={imageToProcess}
                  alt="Crop preview"
                  className="w-full h-full object-cover"
                  style={{
                    transform: `scale(${cropSettings.scale}) rotate(${cropSettings.rotation}deg)`,
                    clipPath: `inset(${cropSettings.y * 100}% ${(1 - cropSettings.x - cropSettings.width) * 100}% ${(1 - cropSettings.y - cropSettings.height) * 100}% ${cropSettings.x * 100}%)`,
                  }}
                />
                
                {/* Crop Overlay */}
                <div 
                  className="absolute border-2 border-white shadow-lg"
                  style={{
                    left: `${cropSettings.x * 100}%`,
                    top: `${cropSettings.y * 100}%`,
                    width: `${cropSettings.width * 100}%`,
                    height: `${cropSettings.height * 100}%`,
                  }}
                />
              </div>

              {/* Controls */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Position Controls */}
                <div className="space-y-4">
                  <Label className="font-medium">Position</Label>
                  
                  <div className="space-y-3">
                    <div>
                      <Label className="text-sm">X Position</Label>
                      <Slider
                        value={[cropSettings.x]}
                        onValueChange={([value]) => setCropSettings(prev => ({ ...prev, x: value }))}
                        max={1 - cropSettings.width}
                        step={0.01}
                        className="mt-1"
                      />
                    </div>
                    
                    <div>
                      <Label className="text-sm">Y Position</Label>
                      <Slider
                        value={[cropSettings.y]}
                        onValueChange={([value]) => setCropSettings(prev => ({ ...prev, y: value }))}
                        max={1 - cropSettings.height}
                        step={0.01}
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label className="text-sm">Size</Label>
                      <Slider
                        value={[cropSettings.width]}
                        onValueChange={([value]) => setCropSettings(prev => ({ 
                          ...prev, 
                          width: value, 
                          height: value,
                          x: Math.min(prev.x, 1 - value),
                          y: Math.min(prev.y, 1 - value),
                        }))}
                        min={0.1}
                        max={1}
                        step={0.01}
                        className="mt-1"
                      />
                    </div>
                  </div>
                </div>

                {/* Transform Controls */}
                <div className="space-y-4">
                  <Label className="font-medium">Transform</Label>
                  
                  <div className="space-y-3">
                    <div>
                      <Label className="text-sm flex items-center gap-2">
                        <ZoomIn className="h-4 w-4" />
                        Scale
                      </Label>
                      <Slider
                        value={[cropSettings.scale]}
                        onValueChange={([value]) => setCropSettings(prev => ({ ...prev, scale: value }))}
                        min={0.5}
                        max={3}
                        step={0.1}
                        className="mt-1"
                      />
                    </div>
                    
                    <div>
                      <div className="flex items-center justify-between">
                        <Label className="text-sm flex items-center gap-2">
                          <RotateCcw className="h-4 w-4" />
                          Rotation
                        </Label>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={resetRotation}
                          className="h-6 px-2 text-xs"
                        >
                          Reset
                        </Button>
                      </div>
                      <Slider
                        value={[cropSettings.rotation]}
                        onValueChange={([value]) => setCropSettings(prev => ({ ...prev, rotation: value }))}
                        min={-180}
                        max={180}
                        step={5}
                        className="mt-1"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Preview */}
              <div className="text-center">
                <Label className="font-medium">Preview</Label>
                <div className="mt-2 flex justify-center">
                  <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-muted">
                    <img
                      src={imageToProcess}
                      alt="Avatar preview"
                      className="w-full h-full object-cover"
                      style={{
                        transform: `scale(${cropSettings.scale}) rotate(${cropSettings.rotation}deg)`,
                        clipPath: `inset(${cropSettings.y * 100}% ${(1 - cropSettings.x - cropSettings.width) * 100}% ${(1 - cropSettings.y - cropSettings.height) * 100}% ${cropSettings.x * 100}%)`,
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={cancelCrop} disabled={isProcessing}>
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
                <Button 
                  onClick={handleCropAndUpload} 
                  disabled={isProcessing}
                  data-testid="apply-crop-button"
                >
                  {isProcessing ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4 mr-2" />
                  )}
                  {isProcessing ? 'Processing...' : 'Apply & Upload'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}