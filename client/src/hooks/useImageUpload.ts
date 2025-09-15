import { useState, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

export interface UploadedImage {
  id: string;
  url: string;
  filename: string;
  size: number;
  mimeType: string;
  width?: number;
  height?: number;
  metadata?: Record<string, any>;
}

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export interface ImageUploadOptions {
  maxSize?: number; // in bytes, default 10MB
  allowedTypes?: string[];
  maxFiles?: number;
  compress?: boolean;
  quality?: number; // 0-1 for compression quality
  maxWidth?: number;
  maxHeight?: number;
  endpoint?: string;
  documentType?: string;
  onProgress?: (progress: UploadProgress) => void;
  onComplete?: (images: UploadedImage[]) => void;
  onError?: (error: string) => void;
}

// Image compression utility
const compressImage = (
  file: File,
  quality: number = 0.8,
  maxWidth: number = 1920,
  maxHeight: number = 1080
): Promise<File> => {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      // Calculate new dimensions
      let { width, height } = img;
      
      if (width > height) {
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width = (width * maxHeight) / height;
          height = maxHeight;
        }
      }

      canvas.width = width;
      canvas.height = height;

      // Draw and compress
      ctx?.drawImage(img, 0, 0, width, height);
      
      canvas.toBlob(
        (blob) => {
          if (blob) {
            const compressedFile = new File([blob], file.name, {
              type: file.type,
              lastModified: Date.now(),
            });
            resolve(compressedFile);
          } else {
            resolve(file); // fallback to original
          }
        },
        file.type,
        quality
      );
    };

    img.src = URL.createObjectURL(file);
  });
};

// Get image dimensions
const getImageDimensions = (file: File): Promise<{ width: number; height: number }> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.width, height: img.height });
      URL.revokeObjectURL(img.src);
    };
    img.src = URL.createObjectURL(file);
  });
};

export const useImageUpload = (options: ImageUploadOptions = {}) => {
  const {
    maxSize = 10 * 1024 * 1024, // 10MB default
    allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
    maxFiles = 10,
    compress = true,
    quality = 0.8,
    maxWidth = 1920,
    maxHeight = 1080,
    endpoint = '/api/v1/upload/images',
    documentType = 'image',
    onProgress,
    onComplete,
    onError,
  } = options;

  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [uploadProgress, setUploadProgress] = useState<UploadProgress>({ loaded: 0, total: 0, percentage: 0 });
  const [previews, setPreviews] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  // Validation function
  const validateFile = useCallback((file: File): { valid: boolean; error?: string } => {
    if (!allowedTypes.includes(file.type)) {
      return { valid: false, error: `Invalid file type. Allowed: ${allowedTypes.join(', ')}` };
    }
    
    if (file.size > maxSize) {
      return { 
        valid: false, 
        error: `File too large. Maximum size: ${(maxSize / 1024 / 1024).toFixed(1)}MB` 
      };
    }
    
    return { valid: true };
  }, [allowedTypes, maxSize]);

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: async (files: File[]): Promise<UploadedImage[]> => {
      const formData = new FormData();
      const processedFiles: File[] = [];

      // Process and compress files
      for (const file of files) {
        const validation = validateFile(file);
        if (!validation.valid) {
          throw new Error(validation.error);
        }

        let processedFile = file;
        
        // Compress image if needed
        if (compress && file.type.startsWith('image/')) {
          try {
            processedFile = await compressImage(file, quality, maxWidth, maxHeight);
          } catch (error) {
            console.warn('Compression failed, using original file:', error);
            processedFile = file;
          }
        }

        processedFiles.push(processedFile);
      }

      // Add files to FormData
      processedFiles.forEach((file, index) => {
        formData.append(files.length > 1 ? 'images' : 'image', file);
      });
      
      formData.append('documentType', documentType);

      // Upload with progress tracking
      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        
        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            const progress = {
              loaded: event.loaded,
              total: event.total,
              percentage: Math.round((event.loaded / event.total) * 100)
            };
            setUploadProgress(progress);
            onProgress?.(progress);
          }
        });

        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const response = JSON.parse(xhr.responseText);
              resolve(response.images || [response.image]);
            } catch (error) {
              reject(new Error('Invalid response format'));
            }
          } else {
            reject(new Error(`Upload failed: ${xhr.statusText}`));
          }
        });

        xhr.addEventListener('error', () => {
          reject(new Error('Upload failed'));
        });

        xhr.open('POST', endpoint);
        xhr.setRequestHeader('Accept', 'application/json');
        xhr.send(formData);
      });
    },
    onMutate: () => {
      setIsUploading(true);
      setUploadProgress({ loaded: 0, total: 0, percentage: 0 });
    },
    onSuccess: (images) => {
      setIsUploading(false);
      setUploadProgress({ loaded: 0, total: 0, percentage: 0 });
      setPreviews([]);
      onComplete?.(images);
      toast({
        title: "Upload successful",
        description: `${images.length} image${images.length > 1 ? 's' : ''} uploaded successfully.`,
      });
    },
    onError: (error: any) => {
      setIsUploading(false);
      setUploadProgress({ loaded: 0, total: 0, percentage: 0 });
      const errorMessage = error.message || 'Upload failed';
      onError?.(errorMessage);
      toast({
        title: "Upload failed",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  // Handle file selection
  const handleFiles = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    
    if (fileArray.length > maxFiles) {
      const error = `Too many files. Maximum: ${maxFiles}`;
      onError?.(error);
      toast({
        title: "Too many files",
        description: error,
        variant: "destructive",
      });
      return;
    }

    // Validate all files first
    for (const file of fileArray) {
      const validation = validateFile(file);
      if (!validation.valid) {
        onError?.(validation.error!);
        toast({
          title: "Invalid file",
          description: validation.error,
          variant: "destructive",
        });
        return;
      }
    }

    // Create previews
    const newPreviews = await Promise.all(
      fileArray.map(file => {
        return new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.readAsDataURL(file);
        });
      })
    );
    
    setPreviews(newPreviews);
    
    // Start upload
    uploadMutation.mutate(fileArray);
  }, [maxFiles, validateFile, onError, toast, uploadMutation]);

  // Clear previews
  const clearPreviews = useCallback(() => {
    setPreviews([]);
    setUploadProgress({ loaded: 0, total: 0, percentage: 0 });
  }, []);

  return {
    handleFiles,
    clearPreviews,
    previews,
    uploadProgress,
    isUploading,
    error: uploadMutation.error?.message,
    isError: uploadMutation.isError,
    isSuccess: uploadMutation.isSuccess,
    reset: uploadMutation.reset,
    validateFile,
  };
};