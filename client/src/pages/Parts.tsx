import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useLocation } from 'wouter';
import { Header } from '@/components/Header';
import { CartSidebar } from '@/components/CartSidebar';
import { BottomNavigation } from '@/components/BottomNavigation';
import { useCart } from '@/hooks/useCart';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { 
  Filter, 
  Grid, 
  List, 
  Package, 
  Star, 
  ShoppingCart, 
  Search,
  Eye,
  CheckCircle,
  XCircle
} from 'lucide-react';

interface Part {
  id: string;
  name: string;
  description: string;
  price: string;
  stock: number;
  images: string[];
  specifications: Record<string, any>;
  categoryId: string;
  providerId: string;
  rating: string;
  totalSold: number;
  isActive: boolean;
  createdAt: string;
}

interface PartsCategory {
  id: string;
  name: string;
  icon: string;
  description: string;
  isActive: boolean;
}

export default function Parts() {
  const [, setLocation] = useLocation();
  const { addItem, getItemCount } = useCart();
  const { toast } = useToast();
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('popular');
  const [priceRange, setPriceRange] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [inStockOnly, setInStockOnly] = useState(false);

  // Get URL params
  const urlParams = new URLSearchParams(window.location.search);
  const categoryFromUrl = urlParams.get('category');

  useEffect(() => {
    if (categoryFromUrl) {
      setSelectedCategory(categoryFromUrl);
    }
  }, [categoryFromUrl]);

  // Fetch parts categories
  const { data: categories, isLoading: loadingCategories } = useQuery<PartsCategory[]>({
    queryKey: ['/api/v1/parts/categories'],
  });

  // Fetch parts
  const { data: parts, isLoading: loadingParts } = useQuery<Part[]>({
    queryKey: ['/api/v1/parts', { 
      category: selectedCategory !== 'all' ? selectedCategory : undefined,
      sortBy,
      priceRange: priceRange !== 'all' ? priceRange : undefined,
      inStock: inStockOnly ? 'true' : undefined,
      search: searchQuery || undefined
    }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedCategory !== 'all') params.append('category', selectedCategory);
      if (sortBy) params.append('sortBy', sortBy);
      if (priceRange !== 'all') params.append('priceRange', priceRange);
      if (inStockOnly) params.append('inStock', 'true');
      if (searchQuery) params.append('search', searchQuery);

      const response = await fetch(`/api/v1/parts?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch parts');
      return response.json();
    },
  });

  const handlePartView = (partId: string) => {
    setLocation(`/parts/${partId}`);
  };

  const handleAddToCart = (partId: string) => {
    const part = parts?.find((p: Part) => p.id === partId);
    if (part) {
      if (part.stock <= 0) {
        toast({
          title: "Out of Stock",
          description: "This part is currently out of stock.",
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
        type: 'part',
        category: part.categoryId,
        providerId: part.providerId,
      });

      toast({
        title: "Added to Cart",
        description: `${part.name} has been added to your cart.`,
      });
    }
  };

  const PartCard = ({ part }: { part: Part }) => {
    const isOutOfStock = part.stock <= 0;
    const isLowStock = part.stock > 0 && part.stock <= 5;

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="group"
        data-testid={`card-part-${part.id}`}
      >
        <Card className={`h-full transition-all duration-200 hover:shadow-lg ${
          isOutOfStock ? 'opacity-60' : ''
        }`}>
          <CardContent className="p-4">
            <div className="aspect-square bg-muted rounded-lg mb-3 relative overflow-hidden">
              {part.images && part.images.length > 0 ? (
                <img
                  src={part.images[0]}
                  alt={part.name}
                  className="w-full h-full object-cover"
                  data-testid={`img-part-${part.id}`}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Package className="h-12 w-12 text-muted-foreground" />
                </div>
              )}
              
              {/* Stock Status Badge */}
              <div className="absolute top-2 right-2">
                {isOutOfStock ? (
                  <Badge variant="destructive" className="text-xs">
                    <XCircle className="h-3 w-3 mr-1" />
                    Out of Stock
                  </Badge>
                ) : isLowStock ? (
                  <Badge variant="secondary" className="text-xs">
                    <span className="text-yellow-500">⚠</span>
                    Low Stock
                  </Badge>
                ) : (
                  <Badge variant="default" className="text-xs bg-green-600">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    In Stock
                  </Badge>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-start justify-between">
                <h3 
                  className="font-semibold text-sm line-clamp-2 group-hover:text-primary cursor-pointer"
                  onClick={() => handlePartView(part.id)}
                  data-testid={`text-part-name-${part.id}`}
                >
                  {part.name}
                </h3>
              </div>

              <p 
                className="text-sm text-muted-foreground line-clamp-2"
                data-testid={`text-part-description-${part.id}`}
              >
                {part.description}
              </p>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span 
                    className="text-lg font-bold text-primary"
                    data-testid={`text-part-price-${part.id}`}
                  >
                    ₹{parseFloat(part.price).toLocaleString()}
                  </span>
                </div>
                
                <div className="flex items-center space-x-1">
                  <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                  <span className="text-xs text-muted-foreground">
                    {parseFloat(part.rating).toFixed(1)}
                  </span>
                </div>
              </div>

              <div className="text-xs text-muted-foreground">
                <span data-testid={`text-part-stock-${part.id}`}>
                  Stock: {part.stock} units
                </span>
                <span className="mx-2">•</span>
                <span>{part.totalSold} sold</span>
              </div>

              <div className="flex space-x-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => handlePartView(part.id)}
                  data-testid={`button-view-part-${part.id}`}
                >
                  <Eye className="h-4 w-4 mr-1" />
                  View
                </Button>
                <Button
                  size="sm"
                  className="flex-1"
                  disabled={isOutOfStock}
                  onClick={() => handleAddToCart(part.id)}
                  data-testid={`button-add-cart-${part.id}`}
                >
                  <ShoppingCart className="h-4 w-4 mr-1" />
                  Add to Cart
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  };

  const PartCardSkeleton = () => (
    <Card className="h-full">
      <CardContent className="p-4">
        <div className="aspect-square bg-muted rounded-lg mb-3 animate-pulse" />
        <div className="space-y-2">
          <div className="h-4 bg-muted rounded animate-pulse" />
          <div className="h-3 bg-muted rounded animate-pulse w-3/4" />
          <div className="h-4 bg-muted rounded animate-pulse w-1/2" />
          <div className="flex space-x-2 pt-2">
            <div className="h-8 bg-muted rounded animate-pulse flex-1" />
            <div className="h-8 bg-muted rounded animate-pulse flex-1" />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header
        onCartClick={() => setIsCartOpen(true)}
        cartItemsCount={getItemCount()}
      />

      <main className="pt-32 px-4 pb-6">
        {/* Hero Section */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2" data-testid="text-page-title">
            Parts Marketplace
          </h1>
          <p className="text-muted-foreground" data-testid="text-page-description">
            Find quality parts for all your repair and maintenance needs
          </p>
        </div>

        {/* Search and Filters */}
        <div className="mb-6 space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search parts by name, description, or specifications..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="input-search-parts"
            />
          </div>

          {/* Filters Row */}
          <div className="flex flex-wrap gap-3">
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-40" data-testid="select-category">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories?.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={priceRange} onValueChange={setPriceRange}>
              <SelectTrigger className="w-36" data-testid="select-price-range">
                <SelectValue placeholder="Price Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Prices</SelectItem>
                <SelectItem value="low">Under ₹500</SelectItem>
                <SelectItem value="medium">₹500 - ₹2,000</SelectItem>
                <SelectItem value="high">Above ₹2,000</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-36" data-testid="select-sort">
                <SelectValue placeholder="Sort By" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="popular">Most Popular</SelectItem>
                <SelectItem value="rating">Highest Rated</SelectItem>
                <SelectItem value="price-low">Price: Low to High</SelectItem>
                <SelectItem value="price-high">Price: High to Low</SelectItem>
                <SelectItem value="newest">Newest First</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant={inStockOnly ? "default" : "outline"}
              onClick={() => setInStockOnly(!inStockOnly)}
              className="px-4"
              data-testid="button-in-stock-filter"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              In Stock Only
            </Button>

            <div className="flex border rounded-md">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('grid')}
                className="rounded-r-none"
                data-testid="button-grid-view"
              >
                <Grid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
                className="rounded-l-none"
                data-testid="button-list-view"
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Results Count */}
        {parts && (
          <div className="mb-4">
            <p className="text-sm text-muted-foreground" data-testid="text-results-count">
              {parts.length} parts found
              {selectedCategory !== 'all' && (
                <span> in {categories?.find(c => c.id === selectedCategory)?.name}</span>
              )}
            </p>
          </div>
        )}

        {/* Parts Grid */}
        <div className={`grid gap-4 ${
          viewMode === 'grid' 
            ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' 
            : 'grid-cols-1 lg:grid-cols-2'
        }`}>
          {loadingParts ? (
            // Loading skeletons
            Array.from({ length: 8 }, (_, i) => (
              <PartCardSkeleton key={i} />
            ))
          ) : parts && parts.length > 0 ? (
            // Parts list
            parts.map((part) => (
              <PartCard key={part.id} part={part} />
            ))
          ) : (
            // No results
            <div className="col-span-full text-center py-12">
              <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No parts found</h3>
              <p className="text-muted-foreground mb-4">
                Try adjusting your search criteria or browse different categories.
              </p>
              <Button 
                variant="outline" 
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('all');
                  setPriceRange('all');
                  setInStockOnly(false);
                }}
                data-testid="button-clear-filters"
              >
                Clear Filters
              </Button>
            </div>
          )}
        </div>
      </main>

      <CartSidebar isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
      <BottomNavigation />
    </div>
  );
}