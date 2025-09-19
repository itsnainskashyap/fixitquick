import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';
import { authMiddleware } from './middleware/auth';
import { uploadDocument } from './middleware/fileUpload';
import { objectStorageService } from './services/objectStorage';
import { storage } from './storage';

const app = express();

// Basic middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}));

app.use(cors({
  origin: ['http://localhost:5000', 'http://localhost:3000'],
  credentials: true,
}));

// Minimal health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Clean parts provider document upload endpoint
app.post('/api/v1/parts-provider/documents/upload', authMiddleware, uploadDocument, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }

    const { documentType } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    console.log(`📁 Parts provider document upload: ${documentType} for user ${userId}`);

    // Map document types from frontend to backend
    const documentTypeMap: { [key: string]: string } = {
      'aadhar_front': 'aadharFront',
      'aadhar_back': 'aadharBack',
      'photo': 'photo',
      'business_license': 'businessLicense',
      'gst_certificate': 'gstCertificate',
      'bank_statement': 'bankStatement'
    };

    const mappedDocumentType = documentTypeMap[documentType] || documentType;

    // Get or create business info for document uploads during registration
    let businessInfo = await storage.getPartsProviderBusinessInfo(userId);
    if (!businessInfo) {
      // Create a minimal business profile for document uploads during registration
      businessInfo = await storage.createPartsProviderBusinessInfo({
        userId,
        businessName: 'Registration in Progress',
        businessType: 'individual',
        businessAddress: {
          street: 'TBD',
          city: 'TBD', 
          state: 'TBD',
          pincode: '000000',
          country: 'India'
        },
        isVerified: false,
        verificationStatus: 'documents_pending',
        isActive: false,
        totalRevenue: '0.00',
        totalOrders: 0,
        averageRating: '0.00',
        totalProducts: 0,
        minOrderValue: 0,
        processingTime: 24,
        shippingAreas: [],
        paymentTerms: 'immediate',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    // Process the uploaded file through object storage service
    const uploadResult = await objectStorageService.uploadFile(
      file,
      documentType,
      userId,
      false // Private by default
    );

    if (!uploadResult.success) {
      return res.status(500).json({
        success: false,
        message: uploadResult.error || 'Failed to upload document',
        error: 'UPLOAD_FAILED'
      });
    }

    const documents = businessInfo.verificationDocuments || {};
    
    // Update documents based on type
    switch (mappedDocumentType) {
      case 'aadharFront':
        documents.aadharFront = { url: uploadResult.url, verified: false };
        break;
      case 'aadharBack':
        documents.aadharBack = { url: uploadResult.url, verified: false };
        break;
      case 'photo':
        documents.photo = { url: uploadResult.url, verified: false };
        break;
      case 'businessLicense':
        documents.businessLicense = { url: uploadResult.url, verified: false };
        break;
      case 'gstCertificate':
        documents.gstCertificate = { url: uploadResult.url, verified: false };
        break;
      case 'bankStatement':
        documents.bankStatement = { url: uploadResult.url, verified: false };
        break;
      default:
        return res.status(400).json({ success: false, message: 'Invalid document type' });
    }

    // Update verification status to documents_submitted
    const updatedInfo = await storage.updatePartsProviderBusinessInfo(userId, {
      verificationDocuments: documents,
      verificationStatus: 'documents_submitted',
    });

    console.log(`✅ Parts provider document uploaded: ${documentType} for user ${userId}`);

    res.json({
      success: true,
      message: 'Document uploaded successfully',
      url: uploadResult.url,
      documentType: mappedDocumentType,
      businessInfo: updatedInfo
    });
  } catch (error) {
    console.error('Error uploading parts provider document:', error);
    res.status(500).json({ success: false, message: 'Failed to upload document' });
  }
});

// Start server
const port = process.env.PORT || 5001;
app.listen(port, () => {
  console.log(`🚀 Minimal upload server running on port ${port}`);
  console.log(`✅ Upload endpoint available at: POST /api/v1/parts-provider/documents/upload`);
});