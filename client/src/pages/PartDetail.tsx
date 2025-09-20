import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useLocation, useParams } from 'wouter';
import { useCart } from '@/hooks/useCart';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { 
  ArrowLeft,
  Star, 
  ShoppingCart, 
  Package, 
  CheckCircle,
  XCircle,
  Truck,
  Shield,
  Award,
  Eye,
  Heart,
  Plus,
  Minus,
  Info
} from 'lucide-react';

interface Part {
  id: string;
  name: string;
  description: string;
  brand?: string;
  model?: string;
  sku?: string;
  price: string;
  comparePrice?: string;
  stock: number;
  reservedStock?: number;
  lowStockThreshold?: number;
  images?: string[];
  specifications?: Record<string, any>;
  features?: string[];
  categoryId: string;
  providerId: string;
  rating: string;
  totalSold: number;
  totalReviews?: number;
  viewCount?: number;
  weight?: string;
  dimensions?: {
    length?: number;
    width?: number;
    height?: number;
    unit?: 'cm' | 'mm' | 'inch';
  };
  warrantyPeriod?: number;
  warrantyTerms?: string;
  isActive: boolean;
  isFeatured?: boolean;
  availabilityStatus?: 'in_stock' | 'low_stock' | 'out_of_stock' | 'discontinued' | 'pre_order';
  createdAt: string;
  updatedAt: string;
  provider?: {
    id: string;
    name: string;
    isVerified: boolean;
  };
  relatedParts?: Part[];
}

interface PartApiResponse {
  success: boolean;
  data: Part;
}

export default function PartDetail() {
  const params = useParams();
  const { partId } = params;
  const [, setLocation] = useLocation();
  const { addItem, getItemCount } = useCart();
  const { toast } = useToast();
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [isWishlisted, setIsWishlisted] = useState(false);

  // Fetch part details
  const { data: partResponse, isLoading, error } = useQuery<PartApiResponse>({
    queryKey: [`/api/v1/parts/${partId}`],
    enabled: !!partId,
  });
  
  const part = partResponse?.data;

  const isOutOfStock = part ? (part.stock <= 0 || part.availabilityStatus === 'out_of_stock') : false;
  const isLowStock = part ? (part.availabilityStatus === 'low_stock' || (part.stock > 0 && part.stock <= (part.lowStockThreshold || 5))) : false;
  const maxQuantity = part ? Math.min(part.stock, 10) : 1; // Limit to max 10 or available stock

  useEffect(() => {
    if (part) {
      document.title = `${part.name} - FixitQuick Parts`;
      // Add meta description for SEO
      const metaDescription = document.querySelector('meta[name="description"]');
      if (metaDescription) {
        metaDescription.setAttribute('content', 
          part.description ? 
            `${part.description.substring(0, 150)}...` : 
            `Buy ${part.name} - Quality parts for repair and maintenance. Price: ₹${part.price}`
        );
      }
    }
  }, [part]);

  const handleAddToCart = () => {
    if (!part) return;

    if (isOutOfStock) {
      toast({
        title: "Out of Stock",
        description: "This part is currently out of stock.",
        variant: "destructive",
      });
      return;
    }

    if (quantity > part.stock) {
      toast({
        title: "Insufficient Stock",
        description: `Only ${part.stock} units available.`,
        variant: "destructive",
      });
      return;
    }

    addItem({
      id: part.id,
      partId: part.id,
      name: part.name,
      description: part.description,
      price: parseFloat(part.price),
      quantity: quantity,
      type: 'part',
      category: 'Parts', // Category name for display
      categoryId: part.categoryId, // Category ID for backend
      providerId: part.providerId,
    });

    toast({
      title: "Added to Cart",
      description: `${quantity} x ${part.name} added to your cart.`,
    });
  };

  const handleBuyNow = () => {
    handleAddToCart();
    setLocation('/cart');
  };

  const handleQuantityChange = (newQuantity: number) => {
    if (newQuantity >= 1 && newQuantity <= maxQuantity) {
      setQuantity(newQuantity);
    }
  };

  const handleWishlist = () => {
    setIsWishlisted(!isWishlisted);
    toast({
      title: isWishlisted ? "Removed from Wishlist" : "Added to Wishlist",
      description: isWishlisted 
        ? "Part removed from your wishlist." 
        : "Part added to your wishlist.",
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <main className="px-4 py-6">
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Image skeleton */}
              <div className="space-y-4">
                <div className="aspect-square bg-muted rounded-lg animate-pulse" />
                <div className="flex space-x-2">
                  {Array.from({ length: 4 }, (_, i) => (
                    <div key={i} className="w-20 h-20 bg-muted rounded animate-pulse" />
                  ))}
                </div>
              </div>
              {/* Content skeleton */}
              <div className="space-y-4">
                <div className="h-8 bg-muted rounded animate-pulse" />
                <div className="h-4 bg-muted rounded animate-pulse w-3/4" />
                <div className="h-6 bg-muted rounded animate-pulse w-1/2" />
                <div className="h-12 bg-muted rounded animate-pulse" />
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (error || !part) {
    return (
      <div className="min-h-screen bg-background">
        <main className="px-4 py-6">
          <div className="max-w-2xl mx-auto text-center py-12">
            <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2">Part Not Found</h1>
            <p className="text-muted-foreground mb-6">
              The part you're looking for doesn't exist or has been removed.
            </p>
            <Button onClick={() => setLocation('/parts')} data-testid="button-back-to-parts">
              Browse All Parts
            </Button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="px-4 py-6">
        <div className="max-w-6xl mx-auto">
          {/* Back Button */}
          <Button
            variant="ghost"
            onClick={() => setLocation('/parts')}
            className="mb-6"
            data-testid="button-back"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Parts
          </Button>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* Image Gallery */}
            <div className="space-y-4">
              <div className="aspect-square bg-muted rounded-lg overflow-hidden">
                {part.images && part.images.length > 0 ? (
                  <img
                    src={part.images[selectedImageIndex]}
                    alt={part.name}
                    className="w-full h-full object-cover"
                    data-testid="img-part-main"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Package className="h-24 w-24 text-muted-foreground" />
                  </div>
                )}
              </div>

              {/* Thumbnail Gallery */}
              {part.images && part.images.length > 1 && (
                <div className="flex space-x-2 overflow-x-auto">
                  {part.images.map((image, index) => (
                    <button
                      key={index}
                      onClick={() => setSelectedImageIndex(index)}
                      className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 ${
                        selectedImageIndex === index 
                          ? 'border-primary' 
                          : 'border-transparent'
                      }`}
                      data-testid={`button-image-${index}`}
                    >
                      <img
                        src={image}
                        alt={`${part.name} ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Part Details */}
            <div className="space-y-6">
              {/* Header */}
              <div>
                <div className="flex items-start justify-between mb-2">
                  <h1 className="text-2xl font-bold text-foreground" data-testid="text-part-name">
                    {part.name}
                  </h1>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleWishlist}
                    data-testid="button-wishlist"
                  >
                    <Heart className={`h-5 w-5 ${isWishlisted ? 'fill-red-500 text-red-500' : ''}`} />
                  </Button>
                </div>

                <div className="flex items-center space-x-4 mb-4">
                  <div className="flex items-center space-x-1">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    <span className="font-medium" data-testid="text-part-rating">
                      {parseFloat(part.rating).toFixed(1)}
                    </span>
                    <span className="text-muted-foreground">
                      ({part.totalReviews || 0} reviews • {part.totalSold} sold)
                    </span>
                  </div>

                  {part.provider?.isVerified && (
                    <Badge variant="secondary" className="flex items-center space-x-1">
                      <Shield className="h-3 w-3" />
                      <span>Verified Provider</span>
                    </Badge>
                  )}
                </div>

                {/* Stock Status */}
                <div className="mb-4">
                  {isOutOfStock ? (
                    <Badge variant="destructive" className="flex items-center space-x-1 w-fit">
                      <XCircle className="h-4 w-4" />
                      <span>Out of Stock</span>
                    </Badge>
                  ) : isLowStock ? (
                    <Badge variant="secondary" className="flex items-center space-x-1 w-fit">
                      <span className="text-yellow-500">⚠</span>
                      <span>Only {part.stock} left</span>
                    </Badge>
                  ) : (
                    <Badge variant="default" className="flex items-center space-x-1 w-fit bg-green-600">
                      <CheckCircle className="h-4 w-4" />
                      <span>In Stock ({part.stock} available)</span>
                    </Badge>
                  )}
                </div>
              </div>

              {/* Price */}
              <div className="border-t border-b py-4">
                <div className="flex items-center space-x-3">
                  <div className="text-3xl font-bold text-primary" data-testid="text-part-price">
                    ₹{parseFloat(part.price).toLocaleString()}
                  </div>
                  {part.comparePrice && parseFloat(part.comparePrice) > parseFloat(part.price) && (
                    <div className="flex flex-col">
                      <span className="text-lg text-muted-foreground line-through">
                        ₹{parseFloat(part.comparePrice).toLocaleString()}
                      </span>
                      <span className="text-sm text-green-600 font-medium">
                        {Math.round(((parseFloat(part.comparePrice) - parseFloat(part.price)) / parseFloat(part.comparePrice)) * 100)}% OFF
                      </span>
                    </div>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Inclusive of all taxes
                </p>
                {part.brand && (
                  <p className="text-sm text-muted-foreground">
                    Brand: <span className="font-medium">{part.brand}</span>
                    {part.model && <span> • Model: {part.model}</span>}
                    {part.sku && <span> • SKU: {part.sku}</span>}
                  </p>
                )}
              </div>

              {/* Quantity Selector */}
              {!isOutOfStock && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Quantity</label>
                  <div className="flex items-center space-x-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleQuantityChange(quantity - 1)}
                      disabled={quantity <= 1}
                      data-testid="button-quantity-decrease"
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <Input
                      type="number"
                      value={quantity}
                      onChange={(e) => handleQuantityChange(parseInt(e.target.value) || 1)}
                      min={1}
                      max={maxQuantity}
                      className="w-20 text-center"
                      data-testid="input-quantity"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleQuantityChange(quantity + 1)}
                      disabled={quantity >= maxQuantity}
                      data-testid="button-quantity-increase"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      (Max: {maxQuantity})
                    </span>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="space-y-3">
                <Button
                  className="w-full"
                  size="lg"
                  disabled={isOutOfStock}
                  onClick={handleBuyNow}
                  data-testid="button-buy-now"
                >
                  <ShoppingCart className="h-5 w-5 mr-2" />
                  {isOutOfStock ? 'Out of Stock' : 'Buy Now'}
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  size="lg"
                  disabled={isOutOfStock}
                  onClick={handleAddToCart}
                  data-testid="button-add-to-cart"
                >
                  Add to Cart
                </Button>
              </div>

              {/* Provider Info */}
              {part.provider && (
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium">Sold by</h3>
                        <p className="text-sm text-muted-foreground">
                          {part.provider.name}
                        </p>
                      </div>
                      {part.provider.isVerified && (
                        <Badge variant="secondary">
                          <Award className="h-3 w-3 mr-1" />
                          Verified
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Shipping Info */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-3">
                    <Truck className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium">Fast Delivery</p>
                      <p className="text-sm text-muted-foreground">
                        Usually delivered in 2-3 business days
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Detailed Information Tabs */}
          <Tabs defaultValue="description" className="mb-8">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="description" data-testid="tab-description">Description</TabsTrigger>
              <TabsTrigger value="specifications" data-testid="tab-specifications">Specifications</TabsTrigger>
              <TabsTrigger value="reviews" data-testid="tab-reviews">Reviews</TabsTrigger>
            </TabsList>

            <TabsContent value="description" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Product Description</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed" data-testid="text-part-description">
                    {part.description || 'No description available for this part.'}
                  </p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="specifications" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Technical Specifications</CardTitle>
                </CardHeader>
                <CardContent>
                  {part.specifications && Object.keys(part.specifications).length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {Object.entries(part.specifications).map(([key, value]) => (
                        <div key={key} className="flex justify-between py-2 border-b">
                          <span className="font-medium capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
                          <span className="text-muted-foreground" data-testid={`spec-${key}`}>
                            {String(value)}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">
                      No specifications available for this part.
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="reviews" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Customer Reviews</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8">
                    <Star className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">
                      No reviews yet. Be the first to review this part!
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Related Parts */}
          {part.relatedParts && part.relatedParts.length > 0 && (
            <div>
              <h2 className="text-xl font-bold mb-6">Related Parts</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {part.relatedParts.map((relatedPart) => (
                  <Card 
                    key={relatedPart.id}
                    className="cursor-pointer hover:shadow-lg transition-shadow"
                    onClick={() => setLocation(`/parts/${relatedPart.id}`)}
                    data-testid={`card-related-part-${relatedPart.id}`}
                  >
                    <CardContent className="p-4">
                      <div className="aspect-square bg-muted rounded-lg mb-3 overflow-hidden">
                        {relatedPart.images && relatedPart.images.length > 0 ? (
                          <img
                            src={relatedPart.images[0]}
                            alt={relatedPart.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package className="h-8 w-8 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <h3 className="font-medium text-sm line-clamp-2 mb-2">
                        {relatedPart.name}
                      </h3>
                      <p className="text-primary font-bold">
                        ₹{parseFloat(relatedPart.price).toLocaleString()}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

    </div>
  );
}