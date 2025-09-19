import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, X, FileImage, Video, Check, AlertCircle, Loader2 } from 'lucide-react';
import { cn, formatFileSize } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

interface UploadFile {
  id: string;
  file: File;
  preview: string;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  progress: number;
  error?: string;
  mediaUrl?: string;
  thumbnailUrl?: string;
}

interface PromotionalMediaUploadProps {
  onUploadComplete: (files: UploadFile[]) => void;
  onUploadError: (error: string) => void;
  acceptedTypes?: string[];
  maxFileSize?: number; // in MB
  maxFiles?: number;
  className?: string;
  'data-testid'?: string;
}

export default function PromotionalMediaUpload({
  onUploadComplete,
  onUploadError,
  acceptedTypes = ['image/*', 'video/*'],
  maxFileSize = 50, // 50MB for videos, 5MB for images
  maxFiles = 10,
  className,
  'data-testid': testId,
}: PromotionalMediaUploadProps) {
  const [uploadFiles, setUploadFiles] = useState<UploadFile[]>([]);
  const [isDragActive, setIsDragActive] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [dragCounter, setDragCounter] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // File validation
  const validateFile = useCallback((file: File): { valid: boolean; error?: string } => {
    // Check file type
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');
    
    if (!isImage && !isVideo) {
      return { valid: false, error: 'Only image and video files are allowed' };
    }

    // Check file size based on type
    const sizeLimit = isImage ? 5 : 50; // 5MB for images, 50MB for videos
    const sizeMB = file.size / (1024 * 1024);
    
    if (sizeMB > sizeLimit) {
      return { 
        valid: false, 
        error: `File size exceeds ${sizeLimit}MB limit (${sizeMB.toFixed(1)}MB)` 
      };
    }

    // Check supported formats
    const supportedImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const supportedVideoTypes = ['video/mp4', 'video/webm', 'video/quicktime'];
    
    if (isImage && !supportedImageTypes.includes(file.type)) {
      return { valid: false, error: 'Unsupported image format. Use JPG, PNG, or WebP' };
    }
    
    if (isVideo && !supportedVideoTypes.includes(file.type)) {
      return { valid: false, error: 'Unsupported video format. Use MP4, WebM, or MOV' };
    }

    return { valid: true };
  }, []);

  // Generate preview for file
  const generatePreview = useCallback((file: File): Promise<string> => {
    return new Promise((resolve) => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.readAsDataURL(file);
      } else if (file.type.startsWith('video/')) {
        const video = document.createElement('video');
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        video.addEventListener('loadedmetadata', () => {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          video.currentTime = 1; // Capture frame at 1 second
        });
        
        video.addEventListener('seeked', () => {
          if (ctx) {
            ctx.drawImage(video, 0, 0);
            resolve(canvas.toDataURL('image/jpeg', 0.8));
          }
        });
        
        video.src = URL.createObjectURL(file);
      }
    });
  }, []);

  // Process selected files
  const processFiles = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    
    // Check max files limit
    if (uploadFiles.length + fileArray.length > maxFiles) {
      onUploadError(`Maximum ${maxFiles} files allowed`);
      return;
    }

    const newUploadFiles: UploadFile[] = [];

    for (const file of fileArray) {
      const validation = validateFile(file);
      
      if (!validation.valid) {
        toast({
          title: 'Invalid file',
          description: validation.error,
          variant: 'destructive',
        });
        continue;
      }

      const preview = await generatePreview(file);
      
      const uploadFile: UploadFile = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        file,
        preview,
        status: 'pending',
        progress: 0,
      };

      newUploadFiles.push(uploadFile);
    }

    setUploadFiles(prev => [...prev, ...newUploadFiles]);
  }, [uploadFiles.length, maxFiles, validateFile, generatePreview, onUploadError, toast]);

  // Upload file to object storage
  const uploadToObjectStorage = useCallback(async (uploadFile: UploadFile): Promise<void> => {
    const formData = new FormData();
    formData.append('file', uploadFile.file);
    formData.append('mediaType', uploadFile.file.type.startsWith('image/') ? 'image' : 'video');
    formData.append('generateThumbnail', 'true');

    try {
      // Update status to uploading
      setUploadFiles(prev => prev.map(f => 
        f.id === uploadFile.id 
          ? { ...f, status: 'uploading', progress: 0 }
          : f
      ));

      // Use XMLHttpRequest for progress tracking
      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const progress = Math.round((e.loaded / e.total) * 100);
            setUploadFiles(prev => prev.map(f => 
              f.id === uploadFile.id 
                ? { ...f, progress }
                : f
            ));
          }
        });

        xhr.addEventListener('load', () => {
          if (xhr.status === 200) {
            const response = JSON.parse(xhr.responseText);
            setUploadFiles(prev => prev.map(f => 
              f.id === uploadFile.id 
                ? { 
                    ...f, 
                    status: 'completed', 
                    progress: 100,
                    mediaUrl: response.mediaUrl,
                    thumbnailUrl: response.thumbnailUrl,
                  }
                : f
            ));
            resolve();
          } else {
            const errorText = xhr.responseText;
            setUploadFiles(prev => prev.map(f => 
              f.id === uploadFile.id 
                ? { ...f, status: 'error', error: errorText }
                : f
            ));
            reject(new Error(errorText));
          }
        });

        xhr.addEventListener('error', () => {
          setUploadFiles(prev => prev.map(f => 
            f.id === uploadFile.id 
              ? { ...f, status: 'error', error: 'Upload failed' }
              : f
          ));
          reject(new Error('Upload failed'));
        });

        xhr.open('POST', '/api/v1/admin/promotional-media/upload');
        xhr.send(formData);
      });
    } catch (error) {
      setUploadFiles(prev => prev.map(f => 
        f.id === uploadFile.id 
          ? { ...f, status: 'error', error: error instanceof Error ? error.message : 'Upload failed' }
          : f
      ));
      throw error;
    }
  }, []);

  // Upload all pending files
  const uploadAllFiles = useCallback(async () => {
    const pendingFiles = uploadFiles.filter(f => f.status === 'pending');
    
    if (pendingFiles.length === 0) {
      return;
    }

    setIsUploading(true);

    try {
      // Upload files sequentially to avoid overwhelming the server
      for (const file of pendingFiles) {
        await uploadToObjectStorage(file);
      }

      // Check if all uploads completed successfully
      const completedFiles = uploadFiles.filter(f => f.status === 'completed');
      onUploadComplete(completedFiles);

      toast({
        title: 'Upload completed',
        description: `Successfully uploaded ${completedFiles.length} files`,
      });
    } catch (error) {
      onUploadError('Some uploads failed. Please try again.');
    } finally {
      setIsUploading(false);
    }
  }, [uploadFiles, uploadToObjectStorage, onUploadComplete, onUploadError, toast]);

  // Remove file from upload queue
  const removeFile = useCallback((fileId: string) => {
    setUploadFiles(prev => prev.filter(f => f.id !== fileId));
  }, []);

  // Clear all files
  const clearAll = useCallback(() => {
    setUploadFiles([]);
  }, []);

  // Drag and drop handlers
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragCounter(prev => prev + 1);
    setIsDragActive(true);
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

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      processFiles(files);
    }
  }, [processFiles]);

  // File input handler
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processFiles(files);
    }
    // Reset input value to allow selecting the same file again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [processFiles]);

  const getStatusIcon = (status: UploadFile['status']) => {
    switch (status) {
      case 'pending':
        return <Upload className="w-4 h-4 text-muted-foreground" />;
      case 'uploading':
        return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
      case 'completed':
        return <Check className="w-4 h-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
    }
  };

  const getStatusColor = (status: UploadFile['status']) => {
    switch (status) {
      case 'pending':
        return 'bg-muted';
      case 'uploading':
        return 'bg-blue-100 dark:bg-blue-900/20';
      case 'completed':
        return 'bg-green-100 dark:bg-green-900/20';
      case 'error':
        return 'bg-red-100 dark:bg-red-900/20';
    }
  };

  return (
    <div className={cn('space-y-4', className)} data-testid={testId}>
      {/* Upload Area */}
      <div
        className={cn(
          'relative border-2 border-dashed rounded-lg p-8 text-center transition-colors duration-200',
          isDragActive 
            ? 'border-primary bg-primary/5' 
            : 'border-border hover:border-primary/50',
          'cursor-pointer'
        )}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        data-testid="upload-area"
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={acceptedTypes.join(',')}
          onChange={handleFileSelect}
          className="hidden"
          data-testid="file-input"
        />

        <motion.div
          animate={isDragActive ? { scale: 1.05 } : { scale: 1 }}
          transition={{ duration: 0.2 }}
        >
          <Upload className={cn(
            'w-12 h-12 mx-auto mb-4 transition-colors',
            isDragActive ? 'text-primary' : 'text-muted-foreground'
          )} />
          
          <h4 className="font-medium text-foreground mb-2">
            {isDragActive ? 'Drop files here' : 'Upload Promotional Media'}
          </h4>
          
          <p className="text-sm text-muted-foreground mb-4">
            Drag & drop files here, or click to select files
          </p>
          
          <div className="flex flex-wrap gap-2 justify-center text-xs text-muted-foreground">
            <Badge variant="outline">Images: JPG, PNG, WebP (max 5MB)</Badge>
            <Badge variant="outline">Videos: MP4, WebM (max 50MB)</Badge>
            <Badge variant="outline">Max {maxFiles} files</Badge>
          </div>
        </motion.div>
      </div>

      {/* File List */}
      {uploadFiles.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h5 className="font-medium text-foreground">
                Files ({uploadFiles.length})
              </h5>
              
              <div className="flex gap-2">
                {uploadFiles.some(f => f.status === 'pending') && (
                  <Button
                    size="sm"
                    onClick={uploadAllFiles}
                    disabled={isUploading}
                    data-testid="upload-all"
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-2" />
                        Upload All
                      </>
                    )}
                  </Button>
                )}
                
                <Button
                  size="sm"
                  variant="outline"
                  onClick={clearAll}
                  disabled={isUploading}
                  data-testid="clear-all"
                >
                  Clear All
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <AnimatePresence>
                {uploadFiles.map((uploadFile) => (
                  <motion.div
                    key={uploadFile.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.2 }}
                    className={cn(
                      'flex items-center gap-3 p-3 rounded-lg border',
                      getStatusColor(uploadFile.status)
                    )}
                    data-testid={`file-item-${uploadFile.id}`}
                  >
                    {/* Preview */}
                    <div className="relative w-12 h-12 rounded-md overflow-hidden bg-muted flex-shrink-0">
                      <img
                        src={uploadFile.preview}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                      
                      {/* Type indicator */}
                      <div className="absolute top-1 left-1">
                        {uploadFile.file.type.startsWith('video/') ? (
                          <Video className="w-3 h-3 text-white drop-shadow" />
                        ) : (
                          <FileImage className="w-3 h-3 text-white drop-shadow" />
                        )}
                      </div>
                    </div>

                    {/* File info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-foreground truncate">
                          {uploadFile.file.name}
                        </p>
                        <div className="flex items-center gap-1">
                          {getStatusIcon(uploadFile.status)}
                        </div>
                      </div>
                      
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(uploadFile.file.size)}
                      </p>

                      {/* Progress bar */}
                      {uploadFile.status === 'uploading' && (
                        <Progress 
                          value={uploadFile.progress} 
                          className="h-1 mt-1"
                        />
                      )}

                      {/* Error message */}
                      {uploadFile.status === 'error' && uploadFile.error && (
                        <Alert className="mt-2">
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription className="text-xs">
                            {uploadFile.error}
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>

                    {/* Remove button */}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeFile(uploadFile.id)}
                      disabled={uploadFile.status === 'uploading'}
                      data-testid={`remove-file-${uploadFile.id}`}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}