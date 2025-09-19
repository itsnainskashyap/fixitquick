import { useState, useCallback } from 'react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { cn, formatFileSize } from '@/lib/utils';
import ImageUpload, { type ImageUploadRef } from '@/components/ImageUpload';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { type UploadedImage } from '@/hooks/useImageUpload';
import { 
  Star,
  GripVertical,
  Edit,
  Trash2,
  Eye,
  Download,
  Tag,
  Image as ImageIcon,
  Grid3X3,
  List,
  Filter,
  Search,
  Plus,
  Settings,
  Move,
  Copy,
  Share2
} from 'lucide-react';

export interface ImageGalleryItem extends UploadedImage {
  isPrimary?: boolean;
  category?: 'main' | 'gallery' | 'technical' | 'before' | 'after';
  caption?: string;
  altText?: string;
  tags?: string[];
  sortOrder?: number;
  isVisible?: boolean;
}

export interface ImageGalleryProps {
  images: ImageGalleryItem[];
  onChange: (images: ImageGalleryItem[]) => void;
  maxImages?: number;
  allowReorder?: boolean;
  allowEdit?: boolean;
  allowCategories?: boolean;
  categories?: { value: string; label: string }[];
  className?: string;
  viewMode?: 'grid' | 'list';
  gridColumns?: number;
  uploadEndpoint?: string;
  documentType?: string;
  disabled?: boolean;
}

const defaultCategories = [
  { value: 'main', label: 'Main Image' },
  { value: 'gallery', label: 'Gallery' },
  { value: 'technical', label: 'Technical' },
  { value: 'before', label: 'Before' },
  { value: 'after', label: 'After' },
];

export default function ImageGallery({
  images,
  onChange,
  maxImages = 20,
  allowReorder = true,
  allowEdit = true,
  allowCategories = true,
  categories = defaultCategories,
  className,
  viewMode = 'grid',
  gridColumns = 4,
  uploadEndpoint = '/api/v1/upload/images',
  documentType = 'product_image',
  disabled = false,
}: ImageGalleryProps) {
  const [currentViewMode, setCurrentViewMode] = useState(viewMode);
  const [editingImage, setEditingImage] = useState<ImageGalleryItem | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  // Handle new image uploads
  const handleNewImages = useCallback((newImages: UploadedImage[]) => {
    const galleryItems: ImageGalleryItem[] = newImages.map((img, index) => ({
      ...img,
      isPrimary: images.length === 0 && index === 0, // First image is primary if no images exist
      category: 'gallery' as const,
      caption: '',
      altText: img.filename,
      tags: [],
      sortOrder: images.length + index,
      isVisible: true,
    }));

    onChange([...images, ...galleryItems]);
  }, [images, onChange]);

  // Set primary image
  const setPrimaryImage = useCallback((imageId: string) => {
    const updatedImages = images.map(img => ({
      ...img,
      isPrimary: img.id === imageId,
    }));
    onChange(updatedImages);
  }, [images, onChange]);

  // Remove image
  const removeImage = useCallback((imageId: string) => {
    const updatedImages = images.filter(img => img.id !== imageId);
    // If removed image was primary, make first image primary
    if (updatedImages.length > 0 && !updatedImages.some(img => img.isPrimary)) {
      updatedImages[0].isPrimary = true;
    }
    onChange(updatedImages);
  }, [images, onChange]);

  // Handle reorder
  const handleReorder = useCallback((reorderedImages: ImageGalleryItem[]) => {
    const updatedImages = reorderedImages.map((img, index) => ({
      ...img,
      sortOrder: index,
    }));
    onChange(updatedImages);
  }, [onChange]);

  // Update image details
  const updateImage = useCallback((imageId: string, updates: Partial<ImageGalleryItem>) => {
    const updatedImages = images.map(img => 
      img.id === imageId ? { ...img, ...updates } : img
    );
    onChange(updatedImages);
  }, [images, onChange]);

  // Open edit dialog
  const openEditDialog = useCallback((image: ImageGalleryItem) => {
    setEditingImage(image);
    setIsEditDialogOpen(true);
  }, []);

  // Save image edits
  const saveImageEdits = useCallback(() => {
    if (editingImage) {
      updateImage(editingImage.id, editingImage);
      setIsEditDialogOpen(false);
      setEditingImage(null);
    }
  }, [editingImage, updateImage]);

  // Filter images
  const filteredImages = images.filter(img => {
    const matchesSearch = img.filename.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         img.caption?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         img.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesCategory = filterCategory === 'all' || img.category === filterCategory;
    
    return matchesSearch && matchesCategory && img.isVisible !== false;
  });

  const primaryImage = images.find(img => img.isPrimary);
  const canUploadMore = images.length < maxImages;

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold">Image Gallery</h3>
          <Badge variant="secondary">
            {images.length} / {maxImages}
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search images..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 w-40"
            />
          </div>

          {/* Category Filter */}
          {allowCategories && (
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {categories.map(cat => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* View Mode Toggle */}
          <div className="flex border rounded-md">
            <Button
              variant={currentViewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setCurrentViewMode('grid')}
              className="rounded-r-none"
            >
              <Grid3X3 className="h-4 w-4" />
            </Button>
            <Button
              variant={currentViewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setCurrentViewMode('list')}
              className="rounded-l-none"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Upload Area */}
      {canUploadMore && !disabled && (
        <ImageUpload
          maxFiles={maxImages - images.length}
          onComplete={handleNewImages}
          endpoint={uploadEndpoint}
          documentType={documentType}
          variant="compact"
          dragText="Drag images to add to gallery"
          browseText="Add Images"
          className="border-dashed"
        />
      )}

      {/* Primary Image Display */}
      {primaryImage && (
        <div className="space-y-2">
          <Label className="text-sm font-medium flex items-center gap-2">
            <Star className="h-4 w-4 text-yellow-500 fill-current" />
            Primary Image
          </Label>
          <div className="relative w-full max-w-md h-48 rounded-lg overflow-hidden bg-muted">
            <img
              src={primaryImage.url}
              alt={primaryImage.altText || primaryImage.filename}
              className="w-full h-full object-cover"
            />
            <Badge className="absolute top-2 left-2">Primary</Badge>
          </div>
        </div>
      )}

      {/* Images Grid/List */}
      {filteredImages.length > 0 ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">
              All Images ({filteredImages.length})
            </Label>
            {allowReorder && filteredImages.length > 1 && (
              <Badge variant="outline" className="text-xs">
                <GripVertical className="h-3 w-3 mr-1" />
                Drag to reorder
              </Badge>
            )}
          </div>

          {allowReorder ? (
            <Reorder.Group
              axis="y"
              values={filteredImages}
              onReorder={handleReorder}
              className={cn(
                'grid gap-3',
                currentViewMode === 'grid' 
                  ? `grid-cols-2 sm:grid-cols-3 md:grid-cols-${gridColumns}` 
                  : 'grid-cols-1'
              )}
            >
              {filteredImages.map((image) => (
                <ImageGalleryCard
                  key={image.id}
                  image={image}
                  viewMode={currentViewMode}
                  allowEdit={allowEdit}
                  allowCategories={allowCategories}
                  categories={categories}
                  onSetPrimary={setPrimaryImage}
                  onEdit={openEditDialog}
                  onRemove={removeImage}
                  onUpdate={updateImage}
                  disabled={disabled}
                />
              ))}
            </Reorder.Group>
          ) : (
            <div className={cn(
              'grid gap-3',
              currentViewMode === 'grid' 
                ? `grid-cols-2 sm:grid-cols-3 md:grid-cols-${gridColumns}` 
                : 'grid-cols-1'
            )}>
              {filteredImages.map((image) => (
                <ImageGalleryCard
                  key={image.id}
                  image={image}
                  viewMode={currentViewMode}
                  allowEdit={allowEdit}
                  allowCategories={allowCategories}
                  categories={categories}
                  onSetPrimary={setPrimaryImage}
                  onEdit={openEditDialog}
                  onRemove={removeImage}
                  onUpdate={updateImage}
                  disabled={disabled}
                />
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          <ImageIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No images found</p>
          {searchTerm && (
            <Button 
              variant="link" 
              size="sm"
              onClick={() => setSearchTerm('')}
              className="mt-2"
            >
              Clear search
            </Button>
          )}
        </div>
      )}

      {/* Edit Image Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Image Details</DialogTitle>
          </DialogHeader>
          
          {editingImage && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Image Preview */}
              <div className="space-y-4">
                <div className="aspect-square rounded-lg overflow-hidden bg-muted">
                  <img
                    src={editingImage.url}
                    alt={editingImage.altText || editingImage.filename}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="text-sm text-muted-foreground">
                  {editingImage.filename} • {formatFileSize(editingImage.size)}
                  {editingImage.width && editingImage.height && 
                    ` • ${editingImage.width}×${editingImage.height}`
                  }
                </div>
              </div>

              {/* Edit Form */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="caption">Caption</Label>
                  <Input
                    id="caption"
                    value={editingImage.caption || ''}
                    onChange={(e) => setEditingImage(prev => prev ? {...prev, caption: e.target.value} : null)}
                    placeholder="Enter image caption..."
                  />
                </div>

                <div>
                  <Label htmlFor="altText">Alt Text</Label>
                  <Input
                    id="altText"
                    value={editingImage.altText || ''}
                    onChange={(e) => setEditingImage(prev => prev ? {...prev, altText: e.target.value} : null)}
                    placeholder="Describe the image for accessibility..."
                  />
                </div>

                {allowCategories && (
                  <div>
                    <Label htmlFor="category">Category</Label>
                    <Select
                      value={editingImage.category || 'gallery'}
                      onValueChange={(value) => setEditingImage(prev => prev ? {...prev, category: value as any} : null)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map(cat => (
                          <SelectItem key={cat.value} value={cat.value}>
                            {cat.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div>
                  <Label htmlFor="tags">Tags</Label>
                  <Input
                    id="tags"
                    value={editingImage.tags?.join(', ') || ''}
                    onChange={(e) => setEditingImage(prev => prev ? {...prev, tags: e.target.value.split(',').map(tag => tag.trim()).filter(Boolean)} : null)}
                    placeholder="tag1, tag2, tag3"
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="isPrimary"
                    checked={editingImage.isPrimary || false}
                    onCheckedChange={(checked) => setEditingImage(prev => prev ? {...prev, isPrimary: checked} : null)}
                  />
                  <Label htmlFor="isPrimary">Set as primary image</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="isVisible"
                    checked={editingImage.isVisible !== false}
                    onCheckedChange={(checked) => setEditingImage(prev => prev ? {...prev, isVisible: checked} : null)}
                  />
                  <Label htmlFor="isVisible">Visible in gallery</Label>
                </div>

                <div className="flex gap-2 pt-4">
                  <Button onClick={saveImageEdits} className="flex-1">
                    Save Changes
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setIsEditDialogOpen(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Individual Image Card Component
interface ImageGalleryCardProps {
  image: ImageGalleryItem;
  viewMode: 'grid' | 'list';
  allowEdit: boolean;
  allowCategories: boolean;
  categories: { value: string; label: string }[];
  onSetPrimary: (imageId: string) => void;
  onEdit: (image: ImageGalleryItem) => void;
  onRemove: (imageId: string) => void;
  onUpdate: (imageId: string, updates: Partial<ImageGalleryItem>) => void;
  disabled: boolean;
}

function ImageGalleryCard({
  image,
  viewMode,
  allowEdit,
  allowCategories,
  categories,
  onSetPrimary,
  onEdit,
  onRemove,
  onUpdate,
  disabled,
}: ImageGalleryCardProps) {
  const categoryLabel = categories.find(cat => cat.value === image.category)?.label || image.category;

  if (viewMode === 'list') {
    return (
      <Reorder.Item
        value={image}
        className="flex items-center gap-4 p-4 border rounded-lg bg-card hover:bg-accent/50 transition-colors"
      >
        <GripVertical className="h-5 w-5 text-muted-foreground cursor-grab" />
        
        <div className="w-16 h-16 rounded-lg overflow-hidden bg-muted flex-shrink-0">
          <img src={image.url} alt={image.altText || image.filename} className="w-full h-full object-cover" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-medium truncate">{image.caption || image.filename}</h4>
            {image.isPrimary && <Star className="h-4 w-4 text-yellow-500 fill-current" />}
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {allowCategories && categoryLabel && <Badge variant="outline" className="text-xs">{categoryLabel}</Badge>}
            <span>{Math.round(image.size / 1024)}KB</span>
            {image.width && image.height && <span>{image.width}×{image.height}</span>}
          </div>
        </div>

        <div className="flex items-center gap-1">
          {!image.isPrimary && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onSetPrimary(image.id)}
              disabled={disabled}
              data-testid={`set-primary-${image.id}`}
            >
              <Star className="h-4 w-4" />
            </Button>
          )}
          {allowEdit && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onEdit(image)}
              disabled={disabled}
            >
              <Edit className="h-4 w-4" />
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => window.open(image.url, '_blank')}
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onRemove(image.id)}
            disabled={disabled}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </Reorder.Item>
    );
  }

  return (
    <Reorder.Item
      value={image}
      className="group relative aspect-square rounded-lg overflow-hidden bg-muted cursor-grab hover:shadow-md transition-shadow"
    >
      <img src={image.url} alt={image.altText || image.filename} className="w-full h-full object-cover" />
      
      {/* Overlay Controls */}
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
        <div className="flex gap-1">
          {!image.isPrimary && (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => onSetPrimary(image.id)}
              disabled={disabled}
              data-testid={`set-primary-${image.id}`}
            >
              <Star className="h-4 w-4" />
            </Button>
          )}
          {allowEdit && (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => onEdit(image)}
              disabled={disabled}
            >
              <Edit className="h-4 w-4" />
            </Button>
          )}
          <Button
            size="sm"
            variant="secondary"
            onClick={() => window.open(image.url, '_blank')}
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => onRemove(image.id)}
            disabled={disabled}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Status Badges */}
      <div className="absolute top-2 left-2 flex flex-col gap-1">
        {image.isPrimary && (
          <Badge className="text-xs bg-yellow-500 text-white">
            <Star className="h-3 w-3 mr-1 fill-current" />
            Primary
          </Badge>
        )}
        {allowCategories && categoryLabel && (
          <Badge variant="secondary" className="text-xs">
            {categoryLabel}
          </Badge>
        )}
      </div>

      {/* Drag Handle */}
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <GripVertical className="h-5 w-5 text-white drop-shadow-sm" />
      </div>

      {/* Image Info */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
        <div className="text-white text-xs truncate" title={image.caption || image.filename}>
          {image.caption || image.filename}
        </div>
        <div className="text-white/80 text-xs">
          {Math.round(image.size / 1024)}KB
          {image.width && image.height && ` • ${image.width}×${image.height}`}
        </div>
      </div>
    </Reorder.Item>
  );
}