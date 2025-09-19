import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useImageUpload, type UploadedImage } from '@/hooks/useImageUpload';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  FileText, 
  Upload, 
  CheckCircle, 
  AlertTriangle, 
  X, 
  Eye, 
  Download,
  Clock,
  Shield,
  Camera,
  FileImage,
  AlertCircle,
  Info,
  Loader2,
  RefreshCw
} from 'lucide-react';

export interface DocumentType {
  id: string;
  name: string;
  description: string;
  required: boolean;
  allowedTypes: string[];
  maxSize: number;
  tips: string[];
  example?: string;
}

export interface UploadedDocument extends UploadedImage {
  documentType: string;
  status: 'pending' | 'under_review' | 'approved' | 'rejected';
  verifiedAt?: string;
  rejectionReason?: string;
  expiryDate?: string;
}

export interface DocumentUploadProps {
  documents: UploadedDocument[];
  onChange: (documents: UploadedDocument[]) => void;
  documentTypes: DocumentType[];
  endpoint?: string;
  disabled?: boolean;
  showStatus?: boolean;
  allowReupload?: boolean;
  className?: string;
}

const defaultDocumentTypes: DocumentType[] = [
  {
    id: 'aadhar_front',
    name: 'Aadhaar Card (Front)',
    description: 'Clear photo of the front side of your Aadhaar card',
    required: true,
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
    maxSize: 10 * 1024 * 1024,
    tips: [
      'Ensure all text is clearly readable',
      'Include all four corners of the card',
      'Avoid glare and shadows',
      'Use good lighting'
    ]
  },
  {
    id: 'aadhar_back',
    name: 'Aadhaar Card (Back)',
    description: 'Clear photo of the back side of your Aadhaar card',
    required: true,
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
    maxSize: 10 * 1024 * 1024,
    tips: [
      'Ensure address is clearly readable',
      'Include all four corners of the card',
      'Avoid glare and shadows'
    ]
  },
  {
    id: 'photo',
    name: 'Profile Photo',
    description: 'A clear headshot photo for your profile',
    required: true,
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
    maxSize: 5 * 1024 * 1024,
    tips: [
      'Use good lighting',
      'Face should be clearly visible',
      'Professional appearance recommended',
      'No filters or editing'
    ]
  },
  {
    id: 'certificate',
    name: 'Certification/Training Certificate',
    description: 'Certificates showing your skills and training',
    required: false,
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
    maxSize: 10 * 1024 * 1024,
    tips: [
      'Upload relevant skill certificates',
      'Ensure certificate details are readable',
      'Include issuing authority information'
    ]
  },
  {
    id: 'license',
    name: 'Business/Professional License',
    description: 'Valid business or professional license',
    required: false,
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
    maxSize: 10 * 1024 * 1024,
    tips: [
      'Ensure license is current and valid',
      'Include expiry date if applicable',
      'License should be clearly readable'
    ]
  },
  {
    id: 'insurance',
    name: 'Insurance Document',
    description: 'Liability or business insurance proof',
    required: false,
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
    maxSize: 10 * 1024 * 1024,
    tips: [
      'Include policy number and coverage details',
      'Ensure document is current',
      'Contact information should be visible'
    ]
  }
];

function getStatusColor(status: string) {
  switch (status) {
    case 'approved': return 'text-green-600 bg-green-50 dark:bg-green-950';
    case 'rejected': return 'text-red-600 bg-red-50 dark:bg-red-950';
    case 'under_review': return 'text-blue-600 bg-blue-50 dark:bg-blue-950';
    case 'pending': return 'text-yellow-600 bg-yellow-50 dark:bg-yellow-950';
    default: return 'text-gray-600 bg-gray-50 dark:bg-gray-950';
  }
}

function getStatusIcon(status: string) {
  switch (status) {
    case 'approved': return <CheckCircle className="h-4 w-4" />;
    case 'rejected': return <AlertTriangle className="h-4 w-4" />;
    case 'under_review': return <Clock className="h-4 w-4" />;
    case 'pending': return <Clock className="h-4 w-4" />;
    default: return <AlertCircle className="h-4 w-4" />;
  }
}

export default function DocumentUpload({
  documents,
  onChange,
  documentTypes = defaultDocumentTypes,
  endpoint = '/api/v1/providers/documents/upload',
  disabled = false,
  showStatus = true,
  allowReupload = true,
  className
}: DocumentUploadProps) {
  const [activeTab, setActiveTab] = useState(documentTypes[0]?.id || 'aadhar_front');
  
  const activeDocumentType = documentTypes.find(dt => dt.id === activeTab);
  const existingDocument = documents.find(doc => doc.documentType === activeTab);

  const handleDocumentUpload = useCallback((newImages: UploadedImage[]) => {
    if (newImages.length > 0 && activeDocumentType) {
      const newDocument: UploadedDocument = {
        ...newImages[0],
        documentType: activeDocumentType.id,
        status: 'pending',
      };

      // Replace existing document of same type or add new
      const updatedDocuments = documents.filter(doc => doc.documentType !== activeDocumentType.id);
      onChange([...updatedDocuments, newDocument]);
    }
  }, [documents, onChange, activeDocumentType]);

  const removeDocument = useCallback((documentId: string) => {
    const updatedDocuments = documents.filter(doc => doc.id !== documentId);
    onChange(updatedDocuments);
  }, [documents, onChange]);

  const requiredDocuments = documentTypes.filter(dt => dt.required);
  const optionalDocuments = documentTypes.filter(dt => !dt.required);
  const uploadedRequiredCount = requiredDocuments.filter(dt => 
    documents.some(doc => doc.documentType === dt.id)
  ).length;

  return (
    <div className={cn('space-y-6', className)}>
      {/* Progress Overview */}
      {showStatus && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Document Verification Progress
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Required Documents Progress */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Required Documents</span>
                <span className="text-sm text-muted-foreground">
                  {uploadedRequiredCount} / {requiredDocuments.length}
                </span>
              </div>
              <Progress 
                value={(uploadedRequiredCount / requiredDocuments.length) * 100} 
                className="h-2"
              />
            </div>

            {/* Status Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {['pending', 'under_review', 'approved', 'rejected'].map(status => {
                const count = documents.filter(doc => doc.status === status).length;
                return (
                  <div key={status} className="text-center">
                    <div className={cn('inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium', getStatusColor(status))}>
                      {getStatusIcon(status)}
                      {count}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1 capitalize">
                      {status.replace('_', ' ')}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Overall Status Alert */}
            {uploadedRequiredCount === requiredDocuments.length ? (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  All required documents uploaded. Review process may take 24-48 hours.
                </AlertDescription>
              </Alert>
            ) : (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Please upload all required documents to complete verification.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Document Upload Tabs */}
      <Card>
        <CardHeader>
          <CardTitle>Upload Documents</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 mb-6">
              {documentTypes.map(docType => {
                const uploaded = documents.find(doc => doc.documentType === docType.id);
                return (
                  <TabsTrigger 
                    key={docType.id} 
                    value={docType.id}
                    className="relative"
                  >
                    <div className="flex items-center gap-1">
                      {docType.name.split(' ')[0]}
                      {docType.required && !uploaded && (
                        <span className="text-red-500">*</span>
                      )}
                      {uploaded && (
                        <div className={cn('w-2 h-2 rounded-full', {
                          'bg-green-500': uploaded.status === 'approved',
                          'bg-red-500': uploaded.status === 'rejected',
                          'bg-blue-500': uploaded.status === 'under_review',
                          'bg-yellow-500': uploaded.status === 'pending',
                        })} />
                      )}
                    </div>
                  </TabsTrigger>
                );
              })}
            </TabsList>

            {documentTypes.map(docType => (
              <TabsContent key={docType.id} value={docType.id} className="space-y-6">
                <DocumentTypeContent
                  documentType={docType}
                  existingDocument={existingDocument}
                  onUpload={handleDocumentUpload}
                  onRemove={removeDocument}
                  endpoint={endpoint}
                  disabled={disabled}
                  allowReupload={allowReupload}
                />
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>

      {/* All Documents Summary */}
      {documents.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Uploaded Documents</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {documents.map(doc => {
                const docType = documentTypes.find(dt => dt.id === doc.documentType);
                return (
                  <motion.div
                    key={doc.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded bg-muted flex items-center justify-center">
                        {doc.mimeType.includes('pdf') ? (
                          <FileText className="h-5 w-5" />
                        ) : (
                          <FileImage className="h-5 w-5" />
                        )}
                      </div>
                      <div>
                        <div className="font-medium">{docType?.name || doc.documentType}</div>
                        <div className="text-sm text-muted-foreground">
                          {doc.filename} • {Math.round(doc.size / 1024)}KB
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge className={cn('text-xs', getStatusColor(doc.status))}>
                        {getStatusIcon(doc.status)}
                        <span className="ml-1 capitalize">
                          {doc.status.replace('_', ' ')}
                        </span>
                      </Badge>

                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => window.open(doc.url, '_blank')}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {allowReupload && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => removeDocument(doc.id)}
                            disabled={disabled}
                            className="text-destructive hover:text-destructive"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Individual Document Type Content Component
interface DocumentTypeContentProps {
  documentType: DocumentType;
  existingDocument?: UploadedDocument;
  onUpload: (images: UploadedImage[]) => void;
  onRemove: (documentId: string) => void;
  endpoint: string;
  disabled: boolean;
  allowReupload: boolean;
}

function DocumentTypeContent({
  documentType,
  existingDocument,
  onUpload,
  onRemove,
  endpoint,
  disabled,
  allowReupload
}: DocumentTypeContentProps) {
  const {
    handleFiles,
    previews,
    uploadProgress,
    isUploading,
    isError,
    error,
    reset
  } = useImageUpload({
    maxFiles: 1,
    allowedTypes: documentType.allowedTypes,
    maxSize: documentType.maxSize,
    endpoint,
    documentType: documentType.id,
    onComplete: onUpload,
  });

  const hasDocument = !!existingDocument;
  const canUpload = !hasDocument || allowReupload;

  return (
    <div className="space-y-6">
      {/* Document Info */}
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            {documentType.name}
            {documentType.required && (
              <Badge variant="secondary" className="text-xs">Required</Badge>
            )}
          </h3>
          <p className="text-muted-foreground mt-1">{documentType.description}</p>
        </div>

        {/* Tips */}
        <div className="bg-muted/50 rounded-lg p-4">
          <h4 className="font-medium mb-2 flex items-center gap-2">
            <Camera className="h-4 w-4" />
            Photography Tips
          </h4>
          <ul className="space-y-1 text-sm text-muted-foreground">
            {documentType.tips.map((tip, index) => (
              <li key={index} className="flex items-start gap-2">
                <span className="text-primary mt-1">•</span>
                {tip}
              </li>
            ))}
          </ul>
        </div>

        {/* File Requirements */}
        <div className="text-sm text-muted-foreground">
          <strong>Accepted formats:</strong> {documentType.allowedTypes.join(', ').toUpperCase()} • 
          <strong> Max size:</strong> {Math.round(documentType.maxSize / 1024 / 1024)}MB
        </div>
      </div>

      {/* Existing Document */}
      {hasDocument && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="border rounded-lg p-4 space-y-4"
        >
          <div className="flex items-center justify-between">
            <h4 className="font-medium">Current Document</h4>
            <Badge className={cn('text-xs', getStatusColor(existingDocument.status))}>
              {getStatusIcon(existingDocument.status)}
              <span className="ml-1 capitalize">
                {existingDocument.status.replace('_', ' ')}
              </span>
            </Badge>
          </div>

          <div className="flex items-center gap-4">
            {existingDocument.mimeType?.includes('pdf') ? (
              <div className="w-16 h-16 rounded bg-red-50 dark:bg-red-950 flex items-center justify-center">
                <FileText className="h-8 w-8 text-red-600" />
              </div>
            ) : (
              <div className="w-16 h-16 rounded overflow-hidden bg-muted">
                <img 
                  src={existingDocument.url} 
                  alt={existingDocument.filename}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            <div className="flex-1">
              <div className="font-medium">{existingDocument.filename}</div>
              <div className="text-sm text-muted-foreground">
                {Math.round(existingDocument.size / 1024)}KB
                {existingDocument.width && existingDocument.height && 
                  ` • ${existingDocument.width}×${existingDocument.height}`
                }
              </div>
              {existingDocument.verifiedAt && (
                <div className="text-sm text-green-600 mt-1">
                  Verified on {new Date(existingDocument.verifiedAt).toLocaleDateString()}
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => window.open(existingDocument.url, '_blank')}
              >
                <Eye className="h-4 w-4 mr-2" />
                View
              </Button>
              {allowReupload && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onRemove(existingDocument.id)}
                  disabled={disabled}
                  className="text-destructive hover:text-destructive"
                >
                  <X className="h-4 w-4 mr-2" />
                  Remove
                </Button>
              )}
            </div>
          </div>

          {/* Rejection Reason */}
          {existingDocument.status === 'rejected' && existingDocument.rejectionReason && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Rejection Reason:</strong> {existingDocument.rejectionReason}
              </AlertDescription>
            </Alert>
          )}

          {/* Expiry Warning */}
          {existingDocument.expiryDate && (
            <Alert>
              <Clock className="h-4 w-4" />
              <AlertDescription>
                <strong>Expires on:</strong> {new Date(existingDocument.expiryDate).toLocaleDateString()}
              </AlertDescription>
            </Alert>
          )}
        </motion.div>
      )}

      {/* Upload Area */}
      {canUpload && !disabled && (
        <div className="space-y-4">
          {hasDocument && allowReupload && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Upload a new document to replace the existing one.
              </AlertDescription>
            </Alert>
          )}

          <div
            className={cn(
              'relative border-2 border-dashed rounded-lg p-8 text-center transition-colors',
              'hover:border-muted-foreground/50',
              isError && 'border-red-500 bg-red-50 dark:bg-red-950'
            )}
            onDrop={(e) => {
              e.preventDefault();
              const files = Array.from(e.dataTransfer.files).filter(file => 
                documentType.allowedTypes.includes(file.type)
              );
              if (files.length > 0) handleFiles(files);
            }}
            onDragOver={(e) => e.preventDefault()}
          >
            <input
              type="file"
              accept={documentType.allowedTypes.join(',')}
              onChange={(e) => e.target.files && handleFiles(e.target.files)}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              disabled={isUploading}
            />

            {isUploading ? (
              <div className="space-y-4">
                <Loader2 className="h-8 w-8 mx-auto animate-spin text-primary" />
                <div>Uploading document...</div>
                <Progress value={uploadProgress.percentage} className="max-w-xs mx-auto" />
              </div>
            ) : isError ? (
              <div className="space-y-4">
                <AlertCircle className="h-8 w-8 mx-auto text-red-500" />
                <div className="text-red-700 dark:text-red-400">
                  {error || 'Upload failed'}
                </div>
                <Button variant="outline" onClick={reset}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Try Again
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                <div>
                  <div className="font-medium">
                    Click to upload or drag and drop
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    {documentType.allowedTypes.join(', ').toUpperCase()} up to {Math.round(documentType.maxSize / 1024 / 1024)}MB
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {!canUpload && hasDocument && !allowReupload && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            Document uploaded successfully. Contact support if you need to make changes.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}