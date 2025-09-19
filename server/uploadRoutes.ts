import { Express } from 'express';
import { authMiddleware } from './middleware/auth';
import { uploadDocument } from './middleware/fileUpload';
import { objectStorageService } from './services/objectStorage';
import { storage } from './storage';
import { setupAuth } from './replitAuth';

export async function setupUploadRoutes(app: Express) {
  // Set up Replit authentication (provides /api/login, /api/callback)
  await setupAuth(app);
  console.log('✅ Authentication routes registered');

  // Essential auth endpoint - check user authentication status
  app.get('/api/auth/user', async (req: any, res) => {
    try {
      console.log('🔍 /api/auth/user: Checking authentication...');
      
      // Check if user is authenticated via Replit session
      if (req.user) {
        const userId = req.user.id || req.user.claims?.sub;
        if (userId) {
          console.log(`🔐 /api/auth/user: Session authentication found for userId: ${userId}`);
          const user = await storage.getUser(userId);
          
          if (user && user.isActive) {
            console.log(`✅ /api/auth/user: Session user ${userId} authenticated successfully`);
            const userWithDisplayName = {
              ...user,
              displayName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'User'
            };
            return res.json(userWithDisplayName);
          }
        }
      }
      
      // No valid authentication found
      console.log('ℹ️ /api/auth/user: No valid authentication found, returning null');
      res.json(null);
      
    } catch (error) {
      console.error("❌ /api/auth/user: Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user data" });
    }
  });

  // Essential API routes for categories and services
  app.get('/api/v1/services/categories/main', async (req, res) => {
    try {
      const categories = await storage.getMainCategories();
      res.json(categories);
    } catch (error) {
      console.error('Error fetching main categories:', error);
      res.status(500).json({ message: 'Failed to fetch categories' });
    }
  });

  app.get('/api/v1/services/categories', async (req, res) => {
    try {
      const categories = await storage.getServiceCategories();
      res.json(categories);
    } catch (error) {
      console.error('Error fetching all categories:', error);
      res.status(500).json({ message: 'Failed to fetch categories' });
    }
  });

  app.get('/api/v1/services', async (req, res) => {
    try {
      const services = await storage.getServices();
      res.json(services);
    } catch (error) {
      console.error('Error fetching services:', error);
      res.status(500).json({ message: 'Failed to fetch services' });
    }
  });

  app.get('/api/v1/parts-categories', async (req, res) => {
    try {
      const partsCategories = await storage.getPartsCategories();
      res.json(partsCategories);
    } catch (error) {
      console.error('Error fetching parts categories:', error);
      res.status(500).json({ message: 'Failed to fetch parts categories' });
    }
  });

  // Stub routes for missing endpoints
  app.get('/api/v1/wallet/balance', authMiddleware, async (req, res) => {
    res.json({ balance: 0, currency: 'INR' });
  });

  app.get('/api/v1/notifications', authMiddleware, async (req, res) => {
    res.json([]);
  });

  app.get('/api/v1/promotional-media/active', async (req, res) => {
    res.json([]);
  });

  app.get('/api/v1/orders/recent', authMiddleware, async (req, res) => {
    res.json([]);
  });

  app.get('/api/v1/services/suggested', async (req, res) => {
    res.json([]);
  });

  // Parts provider document upload endpoint - Fix field name issue  
  app.post('/api/v1/providers/documents/upload', authMiddleware, uploadDocument, async (req, res) => {
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
}