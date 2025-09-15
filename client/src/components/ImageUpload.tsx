import { useState, useRef, useCallback, forwardRef, useImperativeHandle } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useImageUpload, type ImageUploadOptions, type UploadedImage } from '@/hooks/useImageUpload';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  Upload, 
  X, 
  Image as ImageIcon, 
  FileImage,
  Loader2,
  CheckCircle,
  AlertCircle,
  Eye,
  Download,
  RotateCw,
  Trash2,
  Plus
} from 'lucide-react';

export interface ImageUploadProps extends Omit<ImageUploadOptions, 'onComplete' | 'onError'> {
  variant?: 'default' | 'compact' | 'grid' | 'avatar' | 'document';
  className?: string;
  placeholder?: string;
  dragText?: string;
  browseText?: string;
  uploadText?: string;
  disabled?: boolean;
  showPreviews?: boolean;
  showProgress?: boolean;
  allowRemove?: boolean;
  gridColumns?: number;
  aspectRatio?: 'square' | 'portrait' | 'landscape' | 'auto';
  onComplete?: (images: UploadedImage[]) => void;
  onError?: (error: string) => void;
  onRemove?: (index: number) => void;
  initialImages?: UploadedImage[];
}

export interface ImageUploadRef {
  clearAll: () => void;
  addFiles: (files: FileList | File[]) => void;
  getImages: () => UploadedImage[];
}

const ImageUpload = forwardRef<ImageUploadRef, ImageUploadProps>(({
  variant = 'default',
  className,
  placeholder,
  dragText = 'Drag & drop images here',
  browseText = 'Browse files',
  uploadText = 'Upload Images',
  disabled = false,
  showPreviews = true,
  showProgress = true,
  allowRemove = true,
  gridColumns = 3,
  aspectRatio = 'auto',
  onComplete,
  onError,
  onRemove,
  initialImages = [],
  ...uploadOptions
}, ref) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>(initialImages);
  const [dragCounter, setDragCounter] = useState(0);

  const {
    handleFiles,
    clearPreviews,
    previews,
    uploadProgress,
    isUploading,
    isError,
    isSuccess,
    error,
    reset,
  } = useImageUpload({
    ...uploadOptions,
    onComplete: (images) => {
      setUploadedImages(prev => [...prev, ...images]);
      onComplete?.(images);
    },
    onError: (errorMsg) => {
      onError?.(errorMsg);
    }
  });

  // Expose methods via ref
  useImperativeHandle(ref, () => ({
    clearAll: () => {
      setUploadedImages([]);
      clearPreviews();
      reset();
    },
    addFiles: handleFiles,
    getImages: () => uploadedImages,
  }));

  // Drag and drop handlers
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragCounter(prev => prev + 1);
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragActive(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragCounter(prev => {
      const newCounter = prev - 1;
      if (newCounter === 0) {
        setIsDragActive(false);
      }
      return newCounter;
    });
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    setDragCounter(0);

    if (!disabled && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files).filter(file => 
        file.type.startsWith('image/')
      );
      if (files.length > 0) {
        handleFiles(files);
      }
    }
  }, [disabled, handleFiles]);

  // File input handler
  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
      e.target.value = ''; // Reset input
    }
  }, [handleFiles]);

  // Browse files
  const browseFiles = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  // Remove image
  const removeImage = useCallback((index: number, isUploaded: boolean = true) => {
    if (isUploaded) {
      setUploadedImages(prev => prev.filter((_, i) => i !== index));
      onRemove?.(index);
    } else {
      // Remove from previews if not uploaded yet
      // This would need additional logic to handle preview removal
    }
  }, [onRemove]);

  // Get aspect ratio class
  const getAspectRatioClass = () => {
    switch (aspectRatio) {
      case 'square': return 'aspect-square';
      case 'portrait': return 'aspect-[3/4]';
      case 'landscape': return 'aspect-[4/3]';
      default: return '';
    }
  };

  // Variant-specific styles
  const getVariantStyles = () => {
    switch (variant) {
      case 'compact':
        return 'h-32';
      case 'avatar':
        return 'w-32 h-32 rounded-full';
      case 'document':
        return 'h-40 border-2 border-dashed';
      case 'grid':
        return 'min-h-40';
      default:
        return 'h-48';
    }
  };

  const totalImages = uploadedImages.length + previews.length;
  const maxFiles = uploadOptions.maxFiles || 10;

  return (
    <div className={cn('w-full', className)}>
      {/* Upload Area */}
      <div
        className={cn(
          'relative border-2 border-dashed rounded-lg transition-all duration-200',
          'flex flex-col items-center justify-center text-center p-6',
          getVariantStyles(),
          {
            'border-primary bg-primary/5': isDragActive,
            'border-muted-foreground/25 hover:border-muted-foreground/50': !isDragActive && !disabled,
            'border-muted-foreground/10 opacity-50 cursor-not-allowed': disabled,
            'border-green-500 bg-green-50 dark:bg-green-950': isSuccess,
            'border-red-500 bg-red-50 dark:bg-red-950': isError,
          }
        )}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        data-testid="image-upload-area"
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple={uploadOptions.maxFiles !== 1}
          accept={uploadOptions.allowedTypes?.join(',') || 'image/*'}
          onChange={handleFileInput}
          className="hidden"
          disabled={disabled}
          data-testid="file-input"
        />

        {isUploading ? (
          <div className="flex flex-col items-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <div className="text-sm text-muted-foreground">Uploading...</div>
            {showProgress && (
              <div className="w-full max-w-xs">
                <Progress value={uploadProgress.percentage} className="h-2" />
                <div className="text-xs text-center mt-1">
                  {uploadProgress.percentage}% ({Math.round(uploadProgress.loaded / 1024)}KB / {Math.round(uploadProgress.total / 1024)}KB)
                </div>
              </div>
            )}
          </div>
        ) : isSuccess ? (
          <div className="flex flex-col items-center space-y-2">
            <CheckCircle className="h-8 w-8 text-green-500" />
            <div className="text-sm text-green-700 dark:text-green-400">Upload successful!</div>
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center space-y-2">
            <AlertCircle className="h-8 w-8 text-red-500" />
            <div className="text-sm text-red-700 dark:text-red-400">
              {error || 'Upload failed'}
            </div>
            <Button variant="outline" size="sm" onClick={reset}>
              <RotateCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {variant === 'avatar' ? (
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                <ImageIcon className="h-8 w-8 text-muted-foreground" />
              </div>
            ) : (
              <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                {variant === 'document' ? (
                  <FileImage className="h-6 w-6 text-muted-foreground" />
                ) : (
                  <Upload className="h-6 w-6 text-muted-foreground" />
                )}
              </div>
            )}

            <div className="space-y-2">
              <div className="text-sm font-medium">
                {placeholder || dragText}
              </div>
              
              {variant !== 'compact' && (
                <div className="text-xs text-muted-foreground">
                  {uploadOptions.allowedTypes?.join(', ').toUpperCase() || 'JPEG, PNG, WebP'} • Max {Math.round((uploadOptions.maxSize || 10485760) / 1024 / 1024)}MB
                  {maxFiles > 1 && ` • Up to ${maxFiles} files`}
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={browseFiles}
                disabled={disabled || totalImages >= maxFiles}
                data-testid="browse-button"
              >
                <Plus className="h-4 w-4 mr-2" />
                {browseText}
              </Button>
            </div>

            {totalImages > 0 && (
              <Badge variant="secondary" className="text-xs">
                {totalImages} / {maxFiles} files
              </Badge>
            )}
          </div>
        )}

        {isDragActive && (
          <div className="absolute inset-0 bg-primary/10 rounded-lg flex items-center justify-center">
            <div className="text-primary font-medium">Drop files here</div>
          </div>
        )}
      </div>

      {/* Preview Section */}
      {showPreviews && (previews.length > 0 || uploadedImages.length > 0) && (
        <div className="mt-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium">
              {previews.length > 0 ? 'Uploading...' : 'Uploaded Images'}
            </h4>
            {allowRemove && uploadedImages.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setUploadedImages([])}
                className="text-xs h-auto p-1"
              >
                Clear All
              </Button>
            )}
          </div>

          <div className={cn(
            'grid gap-3',
            variant === 'grid' ? `grid-cols-${gridColumns}` : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4'
          )}>
            {/* Upload Previews */}
            <AnimatePresence>
              {previews.map((preview, index) => (
                <motion.div
                  key={`preview-${index}`}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className={cn(
                    'relative group rounded-lg overflow-hidden bg-muted',
                    getAspectRatioClass()
                  )}
                >
                  <img
                    src={preview}
                    alt={`Preview ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                    <Loader2 className="h-6 w-6 text-white animate-spin" />
                  </div>
                  <div className="absolute top-2 right-2">
                    <Badge variant="secondary" className="text-xs">
                      Uploading...
                    </Badge>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Uploaded Images */}
            <AnimatePresence>
              {uploadedImages.map((image, index) => (
                <motion.div
                  key={image.id}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className={cn(
                    'relative group rounded-lg overflow-hidden bg-muted',
                    getAspectRatioClass()
                  )}
                >
                  <img
                    src={image.url}
                    alt={image.filename}
                    className="w-full h-full object-cover transition-transform group-hover:scale-105"
                  />
                  
                  {/* Overlay Controls */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="secondary"
                        className="h-8 w-8 p-0"
                        onClick={() => window.open(image.url, '_blank')}
                        data-testid={`view-image-${index}`}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {allowRemove && (
                        <Button
                          size="sm"
                          variant="destructive"
                          className="h-8 w-8 p-0"
                          onClick={() => removeImage(index)}
                          data-testid={`remove-image-${index}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Image Info */}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                    <div className="text-white text-xs truncate" title={image.filename}>
                      {image.filename}
                    </div>
                    <div className="text-white/80 text-xs">
                      {Math.round(image.size / 1024)}KB
                      {image.width && image.height && ` • ${image.width}×${image.height}`}
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}
    </div>
  );
});

ImageUpload.displayName = 'ImageUpload';

export default ImageUpload;