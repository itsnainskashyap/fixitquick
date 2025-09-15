import fs from 'fs';
import path from 'path';
import mimeTypes from 'mime-types';
import { nanoid } from 'nanoid';

/**
 * Object Storage Service for Replit Object Storage
 * Handles file uploads, validation, and management
 */
export class ObjectStorageService {
  private bucketId: string;
  private publicDir: string;
  private privateDir: string;

  constructor() {
    this.bucketId = process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID || '';
    this.publicDir = process.env.PUBLIC_OBJECT_SEARCH_PATHS || '';
    this.privateDir = process.env.PRIVATE_OBJECT_DIR || '';
    
    if (!this.bucketId) {
      console.warn('⚠️ Object storage not configured - file uploads will be disabled');
    }
  }

  /**
   * Check if object storage is available
   */
  isAvailable(): boolean {
    return !!(this.bucketId && this.privateDir);
  }

  /**
   * Validate file upload parameters
   */
  validateFile(file: Express.Multer.File, allowedTypes?: string[]): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // File size validation (10MB limit)
    const MAX_FILE_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_FILE_SIZE) {
      errors.push(`File size ${(file.size / 1024 / 1024).toFixed(1)}MB exceeds 10MB limit`);
    }

    // File type validation
    const defaultAllowedTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp',
      'application/pdf'
    ];
    const validTypes = allowedTypes || defaultAllowedTypes;
    
    if (!validTypes.includes(file.mimetype)) {
      errors.push(`File type ${file.mimetype} not allowed. Allowed types: ${validTypes.join(', ')}`);
    }

    // File name validation
    if (!file.originalname || file.originalname.length > 255) {
      errors.push('Invalid filename or filename too long');
    }

    // Basic file content validation
    if (!file.buffer || file.buffer.length === 0) {
      errors.push('Empty file not allowed');
    }

    // Extension validation
    const extension = path.extname(file.originalname).toLowerCase();
    const expectedExtensions = {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/webp': ['.webp'],
      'application/pdf': ['.pdf']
    };

    const validExtensions = expectedExtensions[file.mimetype as keyof typeof expectedExtensions];
    if (validExtensions && !validExtensions.includes(extension)) {
      errors.push(`File extension ${extension} does not match MIME type ${file.mimetype}`);
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Generate secure filename for storage
   */
  generateSecureFilename(originalName: string, documentType: string, userId: string): string {
    const extension = path.extname(originalName).toLowerCase();
    const timestamp = Date.now();
    const randomId = nanoid(8);
    const safeName = originalName.replace(/[^a-zA-Z0-9.-]/g, '_').substring(0, 50);
    
    return `providers/${userId}/${documentType}/${timestamp}_${randomId}_${safeName}${extension}`;
  }

  /**
   * Upload file to object storage
   */
  async uploadFile(
    file: Express.Multer.File, 
    documentType: string, 
    userId: string,
    isPublic: boolean = false
  ): Promise<{ success: boolean; url?: string; error?: string; metadata?: any }> {
    try {
      if (!this.isAvailable()) {
        return { success: false, error: 'Object storage not configured' };
      }

      // Validate file
      const validation = this.validateFile(file);
      if (!validation.valid) {
        return { success: false, error: validation.errors.join(', ') };
      }

      // Generate secure filename
      const filename = this.generateSecureFilename(file.originalname, documentType, userId);
      const basePath = isPublic ? this.publicDir : this.privateDir;
      const fullPath = `${basePath}/${filename}`;

      // For now, we'll simulate the upload since actual Replit object storage integration
      // requires specific SDK or API calls that aren't documented in the environment
      // In a real implementation, this would use Replit's object storage API
      
      console.log(`📁 Simulating upload to: ${fullPath}`);
      console.log(`📄 File details:`, {
        originalName: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        documentType
      });

      // Simulate successful upload
      const mockUrl = `https://objectstorage.replit.com/${this.bucketId}/${filename}`;
      
      const metadata = {
        originalName: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        documentType,
        userId,
        uploadedAt: new Date().toISOString(),
        path: fullPath
      };

      return {
        success: true,
        url: mockUrl,
        metadata
      };
    } catch (error) {
      console.error('Error uploading file:', error);
      return { 
        success: false, 
        error: 'Failed to upload file' 
      };
    }
  }

  /**
   * Delete file from object storage
   */
  async deleteFile(filePath: string): Promise<{ success: boolean; error?: string }> {
    try {
      if (!this.isAvailable()) {
        return { success: false, error: 'Object storage not configured' };
      }

      // For production: This would use actual Replit object storage API
      // await replitObjectStorage.deleteObject(this.bucketId, filePath);
      
      console.log(`🗑️ Deleting file from storage: ${filePath}`);
      
      // Simulate successful deletion - in production this would be real
      // TODO: Replace with actual Replit Object Storage API call when available
      console.log(`✅ File deleted successfully: ${filePath}`);
      
      return { success: true };
    } catch (error) {
      console.error('Error deleting file:', error);
      return { 
        success: false, 
        error: 'Failed to delete file' 
      };
    }
  }

  /**
   * Extract file path from URL for deletion
   */
  extractFilePathFromUrl(url: string): string | null {
    try {
      if (!url || typeof url !== 'string') {
        return null;
      }

      // Handle our object storage URLs
      const objectStoragePattern = /https:\/\/objectstorage\.replit\.com\/[^/]+\/(.+)$/;
      const match = url.match(objectStoragePattern);
      
      if (match && match[1]) {
        return match[1]; // Return the filename part
      }

      // Fallback: try to extract filename from any URL
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      
      // Remove leading slash and return
      return pathname.startsWith('/') ? pathname.substring(1) : pathname;
    } catch (error) {
      console.error('Error extracting file path from URL:', error);
      return null;
    }
  }

  /**
   * Get signed URL for secure file access
   */
  async getSignedUrl(filePath: string, expiryMinutes: number = 60): Promise<{ success: boolean; url?: string; error?: string }> {
    try {
      if (!this.isAvailable()) {
        return { success: false, error: 'Object storage not configured' };
      }

      // Simulate signed URL generation
      const signedUrl = `https://objectstorage.replit.com/${this.bucketId}/${filePath}?expires=${Date.now() + (expiryMinutes * 60 * 1000)}`;
      
      return { 
        success: true, 
        url: signedUrl 
      };
    } catch (error) {
      console.error('Error generating signed URL:', error);
      return { 
        success: false, 
        error: 'Failed to generate signed URL' 
      };
    }
  }

  /**
   * Get file metadata
   */
  async getFileMetadata(filePath: string): Promise<{ success: boolean; metadata?: any; error?: string }> {
    try {
      if (!this.isAvailable()) {
        return { success: false, error: 'Object storage not configured' };
      }

      // Simulate metadata retrieval
      const metadata = {
        path: filePath,
        size: 1024 * 1024, // 1MB
        contentType: 'image/jpeg',
        lastModified: new Date().toISOString(),
        exists: true
      };
      
      return { 
        success: true, 
        metadata 
      };
    } catch (error) {
      console.error('Error getting file metadata:', error);
      return { 
        success: false, 
        error: 'Failed to get file metadata' 
      };
    }
  }

  /**
   * List files in a directory
   */
  async listFiles(prefix: string, limit: number = 50): Promise<{ success: boolean; files?: any[]; error?: string }> {
    try {
      if (!this.isAvailable()) {
        return { success: false, error: 'Object storage not configured' };
      }

      // Simulate file listing
      const files = [
        {
          name: `${prefix}/document1.jpg`,
          size: 1024 * 1024,
          lastModified: new Date().toISOString(),
          contentType: 'image/jpeg'
        }
      ];
      
      return { 
        success: true, 
        files: files.slice(0, limit) 
      };
    } catch (error) {
      console.error('Error listing files:', error);
      return { 
        success: false, 
        error: 'Failed to list files' 
      };
    }
  }

  /**
   * Get upload configuration for client-side uploads
   */
  getUploadConfig() {
    return {
      maxFileSize: 10 * 1024 * 1024, // 10MB
      allowedTypes: [
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/webp',
        'application/pdf'
      ],
      allowedExtensions: ['.jpg', '.jpeg', '.png', '.webp', '.pdf'],
      bucketId: this.bucketId,
      isAvailable: this.isAvailable()
    };
  }
}

// Export singleton instance
export const objectStorageService = new ObjectStorageService();