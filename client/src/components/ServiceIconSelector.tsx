import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { EmojiPicker, EmojiButton } from '@/components/ui/emoji-picker';
import ImageUpload from '@/components/ImageUpload';
import { type UploadedImage } from '@/hooks/useImageUpload';
import { Image, Smile, X, Upload, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ServiceIconData {
  iconType: 'emoji' | 'image';
  iconValue?: string;
}

interface ServiceIconSelectorProps {
  currentIcon?: ServiceIconData;
  onIconChange: (iconData: ServiceIconData) => void;
  onImageUpload?: (images: UploadedImage[]) => Promise<void>;
  isUploading?: boolean;
  className?: string;
  showPreview?: boolean;
  compact?: boolean;
}

export function ServiceIconSelector({
  currentIcon,
  onIconChange,
  onImageUpload,
  isUploading = false,
  className,
  showPreview = true,
  compact = false
}: ServiceIconSelectorProps) {
  const [iconType, setIconType] = useState<'emoji' | 'image'>(
    currentIcon?.iconType || 'emoji'
  );
  const [selectedEmoji, setSelectedEmoji] = useState<string>(
    currentIcon?.iconType === 'emoji' ? currentIcon.iconValue || '🔧' : '🔧'
  );
  const [imageUrl, setImageUrl] = useState<string>(
    currentIcon?.iconType === 'image' ? currentIcon.iconValue || '' : ''
  );

  // Update internal state when currentIcon prop changes
  useEffect(() => {
    if (currentIcon) {
      setIconType(currentIcon.iconType);
      if (currentIcon.iconType === 'emoji') {
        setSelectedEmoji(currentIcon.iconValue || '🔧');
      } else if (currentIcon.iconType === 'image') {
        setImageUrl(currentIcon.iconValue || '');
      }
    }
  }, [currentIcon]);

  // Handle icon type change
  const handleIconTypeChange = (newType: 'emoji' | 'image') => {
    setIconType(newType);
    
    // Immediately apply the change with current values
    if (newType === 'emoji') {
      onIconChange({
        iconType: 'emoji',
        iconValue: selectedEmoji
      });
    } else {
      onIconChange({
        iconType: 'image',
        iconValue: imageUrl
      });
    }
  };

  // Handle emoji selection
  const handleEmojiSelect = (emoji: string) => {
    setSelectedEmoji(emoji);
    onIconChange({
      iconType: 'emoji',
      iconValue: emoji
    });
  };

  // Handle image upload
  const handleImageUpload = async (images: UploadedImage[]) => {
    if (images.length > 0) {
      const newImageUrl = images[0].url;
      setImageUrl(newImageUrl);
      onIconChange({
        iconType: 'image',
        iconValue: newImageUrl
      });
      
      // Call the optional upload callback
      if (onImageUpload) {
        await onImageUpload(images);
      }
    }
  };

  // Handle image removal
  const handleImageRemove = () => {
    setImageUrl('');
    onIconChange({
      iconType: 'image',
      iconValue: ''
    });
  };

  // Get current icon for display
  const getCurrentIcon = () => {
    if (iconType === 'emoji') {
      return { type: 'emoji' as const, value: selectedEmoji };
    } else if (iconType === 'image' && imageUrl) {
      return { type: 'image' as const, value: imageUrl };
    }
    return null;
  };

  const currentIconDisplay = getCurrentIcon();

  if (compact) {
    return (
      <div className={cn('space-y-3', className)}>
        <div className="flex items-center space-x-2">
          <Label className="text-sm font-medium">Service Icon</Label>
          <Badge variant="outline" className="text-xs">
            {iconType === 'emoji' ? '😀 Emoji' : '🖼️ Image'}
          </Badge>
        </div>

        <Tabs value={iconType} onValueChange={handleIconTypeChange as any} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="emoji" className="text-xs" data-testid="icon-type-emoji">
              <Smile className="w-3 h-3 mr-1" />
              Emoji
            </TabsTrigger>
            <TabsTrigger value="image" className="text-xs" data-testid="icon-type-image">
              <Image className="w-3 h-3 mr-1" />
              Image
            </TabsTrigger>
          </TabsList>

          <TabsContent value="emoji" className="space-y-2 mt-3">
            <EmojiButton
              emoji={selectedEmoji}
              onSelect={handleEmojiSelect}
              className="w-full h-16 text-2xl"
            />
          </TabsContent>

          <TabsContent value="image" className="space-y-2 mt-3">
            {imageUrl ? (
              <div className="space-y-2">
                <div className="flex items-center space-x-2 p-2 border rounded">
                  <img 
                    src={imageUrl} 
                    alt="Service icon" 
                    className="w-8 h-8 object-cover rounded"
                  />
                  <div className="flex-1 text-sm">
                    <p className="text-muted-foreground">Current image</p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleImageRemove}
                    data-testid="remove-service-image"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ) : (
              <ImageUpload
                variant="compact"
                maxFiles={1}
                maxSize={5 * 1024 * 1024} // 5MB
                accept="image/jpeg,image/jpg,image/png,image/webp"
                placeholder="Upload service icon"
                uploadText="Choose Image"
                onComplete={handleImageUpload}
                onError={(error) => {
                  console.error('Image upload error:', error);
                }}
                data-testid="upload-service-icon"
              />
            )}
          </TabsContent>
        </Tabs>

        {showPreview && currentIconDisplay && (
          <div className="flex items-center space-x-2 p-2 bg-muted rounded">
            <div className="w-6 h-6 flex items-center justify-center">
              {currentIconDisplay.type === 'emoji' ? (
                <span className="text-lg">{currentIconDisplay.value}</span>
              ) : (
                <img 
                  src={currentIconDisplay.value} 
                  alt="Selected icon" 
                  className="w-6 h-6 object-cover rounded"
                />
              )}
            </div>
            <span className="text-sm text-muted-foreground">Current icon</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <Card className={cn('w-full', className)}>
      <CardHeader className="pb-4">
        <CardTitle className="text-lg flex items-center space-x-2">
          <div className="flex items-center space-x-2">
            <span>Service Icon</span>
            <Badge variant="outline">
              {iconType === 'emoji' ? '😀 Emoji' : '🖼️ Image'}
            </Badge>
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        <Tabs value={iconType} onValueChange={handleIconTypeChange as any} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="emoji" data-testid="icon-type-emoji">
              <Smile className="w-4 h-4 mr-2" />
              Emoji
            </TabsTrigger>
            <TabsTrigger value="image" data-testid="icon-type-image">
              <Image className="w-4 h-4 mr-2" />
              Image
            </TabsTrigger>
          </TabsList>

          <TabsContent value="emoji" className="space-y-4 mt-4">
            <div className="space-y-3">
              <Label>Choose an Emoji</Label>
              <EmojiPicker
                selectedEmoji={selectedEmoji}
                onSelect={handleEmojiSelect}
                className="mx-auto"
              />
            </div>
          </TabsContent>

          <TabsContent value="image" className="space-y-4 mt-4">
            <div className="space-y-3">
              <Label>Upload Image Icon</Label>
              
              {imageUrl ? (
                <div className="space-y-3">
                  <div className="flex items-center space-x-4 p-4 border rounded-lg">
                    <img 
                      src={imageUrl} 
                      alt="Service icon" 
                      className="w-16 h-16 object-cover rounded border"
                    />
                    <div className="flex-1">
                      <p className="font-medium">Current Icon</p>
                      <p className="text-sm text-muted-foreground">Image successfully uploaded</p>
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          // Allow re-upload by showing upload component
                          setImageUrl('');
                        }}
                        data-testid="change-service-image"
                      >
                        <Upload className="w-4 h-4 mr-1" />
                        Change
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleImageRemove}
                        data-testid="remove-service-image"
                      >
                        <X className="w-4 h-4 mr-1" />
                        Remove
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <ImageUpload
                  variant="compact"
                  maxFiles={1}
                  maxSize={5 * 1024 * 1024} // 5MB
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  placeholder="Drag and drop or click to upload service icon"
                  uploadText="Choose Image"
                  onComplete={handleImageUpload}
                  onError={(error) => {
                    console.error('Image upload error:', error);
                  }}
                  data-testid="upload-service-icon"
                />
              )}

              <div className="text-xs text-muted-foreground">
                <p>• Recommended size: 64x64 pixels or larger</p>
                <p>• Supported formats: JPEG, PNG, WebP</p>
                <p>• Maximum file size: 5MB</p>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {showPreview && currentIconDisplay && (
          <div className="border-t pt-4">
            <Label className="text-sm font-medium mb-2 block">Preview</Label>
            <div className="flex items-center space-x-3 p-3 bg-muted rounded-lg">
              <div className="w-12 h-12 flex items-center justify-center border rounded bg-background">
                {currentIconDisplay.type === 'emoji' ? (
                  <span className="text-2xl">{currentIconDisplay.value}</span>
                ) : (
                  <img 
                    src={currentIconDisplay.value} 
                    alt="Selected icon" 
                    className="w-10 h-10 object-cover rounded"
                  />
                )}
              </div>
              <div>
                <p className="font-medium">Service Icon Preview</p>
                <p className="text-sm text-muted-foreground">
                  This is how your icon will appear in service cards
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default ServiceIconSelector;