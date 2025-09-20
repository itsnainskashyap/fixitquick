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

  // Admin login endpoint
  app.post('/api/admin/login', async (req, res) => {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: 'Email and password are required'
        });
      }

      // Check admin credentials using getUserByEmail
      const admin = await storage.getUserByEmail(email);
      if (!admin || admin.role !== 'admin') {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials'
        });
      }

      // For development: Use hardcoded password if admin.password is not set
      let isValidPassword = false;
      if (admin.password) {
        // Verify with stored hash
        const bcrypt = await import('bcryptjs');
        isValidPassword = await bcrypt.compare(password, admin.password);
      } else if (process.env.ALLOW_DEV_AUTH === 'true' && process.env.NODE_ENV !== 'production') {
        // Development fallback: Allow development password ONLY if explicitly enabled
        console.log('🔧 Dev mode: Admin password not set, using development authentication (ALLOW_DEV_AUTH=true)');
        isValidPassword = (password === 'Sinha@1357');
      } else {
        console.log('🚫 Dev authentication disabled: ALLOW_DEV_AUTH not set to true or in production');
        isValidPassword = false;
      }
      if (!isValidPassword) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials'
        });
      }

      // Generate JWT token for admin using same secret as the auth middleware
      const jwt = await import('jsonwebtoken');
      // Use jwtService to ensure consistent secret handling
      const { jwtService } = await import('./utils/jwt');
      const accessToken = await jwtService.generateAccessToken(admin.id, admin.role);

      // Set secure httpOnly cookie for admin
      res.cookie('adminToken', accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        path: '/'
      });

      return res.json({
        success: true,
        message: 'Login successful',
        user: {
          id: admin.id,
          email: admin.email,
          role: admin.role,
          firstName: admin.firstName,
          lastName: admin.lastName
        }
      });

    } catch (error) {
      console.error('Admin login error:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  });

  // Essential auth endpoint - check user authentication status
  // Removed conflicting /api/auth/user route - handled by routes.ts

  // Removed conflicting /api/v1/services/categories/main route - handled by routes.ts

  // Parts provider registration endpoint
  app.post('/api/v1/providers/register', authMiddleware, async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, message: 'User not authenticated' });
      }

      const {
        businessName,
        businessType,
        contactPerson,
        businessPhone,
        businessEmail,
        businessAddress,
        experienceYears,
        serviceRadius,
        serviceIds,
        skills,
        gstNumber,
        panNumber,
        bankAccountNumber,
        bankIFSC,
        bankAccountName
      } = req.body;

      console.log('📝 Parts provider registration request:', { userId, businessName, businessType });

      // Create or update the parts provider business info
      const businessInfo = await storage.createPartsProviderBusinessInfo({
        userId,
        businessName,
        businessType,
        // contactPerson, // Not in schema
        // businessPhone, // Not in schema
        // businessEmail, // Not in schema
        businessAddress,
        // experienceYears, serviceRadius, serviceCategories, skills not in schema
        gstNumber,
        panNumber,
        bankAccountNumber,
        // bankIFSC and bankAccountName not in schema
        ifscCode: bankIFSC,
        accountHolderName: bankAccountName,
        isVerified: false,
        verificationStatus: 'under_review',
        isActive: true,
        totalRevenue: '0.00',
        totalOrders: 0,
        averageRating: '0.00',
        totalProducts: 0,
        minOrderValue: '100.00',
        processingTime: 24,
        shippingAreas: [],
        paymentTerms: 'immediate',
        // createdAt and updatedAt are auto-generated
      });

      console.log('✅ Parts provider registration successful:', 'new-business');

      // Update user role to parts_provider after successful registration
      await storage.updateUser(userId, { role: 'parts_provider' });
      console.log(`✅ Updated user ${userId} role to parts_provider`);

      return res.json({
        success: true,
        message: 'Registration submitted successfully',
        businessInfo: businessInfo
      });

    } catch (error) {
      console.error('❌ Provider registration error:', error);
      return res.status(500).json({
        success: false,
        message: 'Registration failed. Please try again.'
      });
    }
  });

  // NOTE: Main /api/v1/parts-provider/profile endpoint is now in routes.ts with proper role validation

  // NOTE: Alias endpoint removed - frontend should use /api/v1/parts-provider/profile directly

  app.get('/api/v1/services/categories', async (req, res) => {
    try {
      const categories = await storage.getMainCategories();
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
  // Use multer.any() to accept any field name
  const multer = (await import('multer')).default;
  const upload = multer({ storage: multer.memoryStorage() });
  
  app.post('/api/v1/providers/documents/upload', authMiddleware, upload.any(), async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, message: 'User not authenticated' });
      }

      const { documentType } = req.body;
      const files = (req as any).files;

      if (!files || files.length === 0) {
        return res.status(400).json({ success: false, message: 'No file uploaded' });
      }

      const file = files[0]; // Get the first uploaded file

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
          verificationStatus: 'pending',
          isActive: false,
          totalRevenue: '0.00',
          totalOrders: 0,
          averageRating: '0.00',
          totalProducts: 0,
          minOrderValue: '0.00',
          processingTime: 24,
          shippingAreas: [],
          paymentTerms: 'immediate',
          // createdAt and updatedAt are auto-generated
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

      const documents = (businessInfo as any).verificationDocuments || {};
      
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