import multer from 'multer';
import path from 'path';
import { Request, Response, NextFunction } from 'express';
import { objectStorageService } from '../services/objectStorage';

// Multer configuration for memory storage (we'll handle the file in memory)
const storage = multer.memoryStorage();

// File filter function for validation
const fileFilter = (req: any, file: Express.Multer.File, callback: multer.FileFilterCallback) => {
  const allowedMimeTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'application/pdf'
  ];

  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.pdf'];
  const extension = path.extname(file.originalname).toLowerCase();

  // Check MIME type
  if (!allowedMimeTypes.includes(file.mimetype)) {
    return callback(new Error(`Invalid file type: ${file.mimetype}. Allowed types: ${allowedMimeTypes.join(', ')}`));
  }

  // Check file extension
  if (!allowedExtensions.includes(extension)) {
    return callback(new Error(`Invalid file extension: ${extension}. Allowed extensions: ${allowedExtensions.join(', ')}`));
  }

  callback(null, true);
};

// Base multer configuration
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 1, // Only one file per request
  },
});

/**
 * Middleware for handling single document upload
 */
export const uploadDocument = upload.single('document');

/**
 * Middleware for handling multiple document uploads
 */
export const uploadMultipleDocuments = upload.array('documents', 5); // Max 5 files

/**
 * Error handling middleware for file upload errors
 */
export const handleUploadError = (error: any, req: Request, res: Response, next: NextFunction) => {
  if (error instanceof multer.MulterError) {
    switch (error.code) {
      case 'LIMIT_FILE_SIZE':
        return res.status(400).json({
          success: false,
          message: 'File too large. Maximum size is 10MB.',
          error: 'FILE_TOO_LARGE'
        });
      case 'LIMIT_FILE_COUNT':
        return res.status(400).json({
          success: false,
          message: 'Too many files. Maximum is 5 files.',
          error: 'TOO_MANY_FILES'
        });
      case 'LIMIT_UNEXPECTED_FILE':
        return res.status(400).json({
          success: false,
          message: 'Unexpected file field. Please check the field name.',
          error: 'UNEXPECTED_FILE'
        });
      default:
        return res.status(400).json({
          success: false,
          message: `Upload error: ${error.message}`,
          error: 'UPLOAD_ERROR'
        });
    }
  } else if (error.message.includes('Invalid file type') || error.message.includes('Invalid file extension')) {
    return res.status(400).json({
      success: false,
      message: error.message,
      error: 'INVALID_FILE_TYPE'
    });
  } else if (error) {
    console.error('File upload error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error during file upload',
      error: 'INTERNAL_ERROR'
    });
  }
  
  next();
};

/**
 * Middleware to validate document type parameter
 */
export const validateDocumentType = (req: Request, res: Response, next: NextFunction) => {
  const allowedDocumentTypes = [
    'aadhar_front',
    'aadhar_back',
    'photo',
    'certificate',
    'license',
    'insurance',
    'portfolio'
  ];

  const { documentType } = req.body;

  if (!documentType) {
    return res.status(400).json({
      success: false,
      message: 'Document type is required',
      error: 'MISSING_DOCUMENT_TYPE'
    });
  }

  if (!allowedDocumentTypes.includes(documentType)) {
    return res.status(400).json({
      success: false,
      message: `Invalid document type. Allowed types: ${allowedDocumentTypes.join(', ')}`,
      error: 'INVALID_DOCUMENT_TYPE'
    });
  }

  next();
};

/**
 * Middleware to validate file was uploaded
 */
export const validateFileExists = (req: Request, res: Response, next: NextFunction) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: 'No file uploaded. Please select a file to upload.',
      error: 'NO_FILE'
    });
  }

  // Additional validation using our service
  const validation = objectStorageService.validateFile(req.file);
  if (!validation.valid) {
    return res.status(400).json({
      success: false,
      message: 'File validation failed',
      errors: validation.errors,
      error: 'VALIDATION_FAILED'
    });
  }

  next();
};

/**
 * Middleware for comprehensive upload validation
 */
export const validateUpload = [
  uploadDocument,
  handleUploadError,
  validateDocumentType,
  validateFileExists
];

/**
 * Get upload configuration for client
 */
export const getUploadConfig = (req: Request, res: Response) => {
  const config = objectStorageService.getUploadConfig();
  res.json({
    success: true,
    config
  });
};

/**
 * Document type validation schema for different document types
 */
export const getDocumentTypeRequirements = (documentType: string) => {
  const requirements: Record<string, any> = {
    aadhar_front: {
      name: 'Aadhaar Card (Front)',
      description: 'Clear photo of the front side of your Aadhaar card',
      required: true,
      maxSize: '10MB',
      allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
      tips: [
        'Ensure all text is clearly readable',
        'Include all four corners of the card',
        'Avoid glare and shadows'
      ]
    },
    aadhar_back: {
      name: 'Aadhaar Card (Back)',
      description: 'Clear photo of the back side of your Aadhaar card',
      required: true,
      maxSize: '10MB',
      allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
      tips: [
        'Ensure address is clearly readable',
        'Include all four corners of the card',
        'Avoid glare and shadows'
      ]
    },
    photo: {
      name: 'Profile Photo',
      description: 'A clear headshot photo for your profile',
      required: true,
      maxSize: '10MB',
      allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
      tips: [
        'Use good lighting',
        'Face should be clearly visible',
        'Professional appearance recommended'
      ]
    },
    certificate: {
      name: 'Certification/Training Certificate',
      description: 'Certificates showing your skills and training',
      required: false,
      maxSize: '10MB',
      allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
      tips: [
        'Upload relevant skill certificates',
        'Ensure certificate details are readable',
        'Include issuing authority information'
      ]
    },
    license: {
      name: 'Business/Professional License',
      description: 'Valid business or professional license',
      required: false,
      maxSize: '10MB',
      allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
      tips: [
        'Ensure license is current and valid',
        'Include expiry date if applicable',
        'License should be clearly readable'
      ]
    },
    insurance: {
      name: 'Insurance Document',
      description: 'Liability or business insurance proof',
      required: false,
      maxSize: '10MB',
      allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
      tips: [
        'Include policy number and coverage details',
        'Ensure document is current',
        'Contact information should be visible'
      ]
    },
    portfolio: {
      name: 'Work Portfolio/Samples',
      description: 'Photos of your previous work or portfolio',
      required: false,
      maxSize: '10MB',
      allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
      tips: [
        'Show your best work examples',
        'Include before and after photos if applicable',
        'Good lighting and clear images'
      ]
    }
  };

  return requirements[documentType] || null;
};