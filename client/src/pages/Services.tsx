import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useLocation } from 'wouter';
import { Header } from '@/components/Header';
import { ServiceCard, ServiceCardSkeleton } from '@/components/ServiceCard';
import { CartSidebar } from '@/components/CartSidebar';
import { BottomNavigation } from '@/components/BottomNavigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery } from '@tanstack/react-query';
import { Filter, Grid, List } from 'lucide-react';

interface Service {
  id: string;
  name: string;
  description: string;
  price: number;
  rating: number;
  totalBookings: number;
  icon: string;
  category: string;
  estimatedDuration: number;
  isActive: boolean;
}

interface ServiceCategory {
  id: string;
  name: string;
  icon: string;
  description: string;
  serviceCount: number;
}

export default function Services() {
  const [, setLocation] = useLocation();
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [cartItems, setCartItems] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('rating');
  const [priceRange, setPriceRange] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [searchQuery, setSearchQuery] = useState('');

  // Get URL params
  const urlParams = new URLSearchParams(window.location.search);
  const categoryFromUrl = urlParams.get('category');

  useEffect(() => {
    if (categoryFromUrl) {
      setSelectedCategory(categoryFromUrl);
    }
  }, [categoryFromUrl]);

  // Fetch service categories
  const { data: categories, isLoading: loadingCategories } = useQuery({
    queryKey: ['/api/v1/services/categories'],
  });

  // Fetch services
  const { data: services, isLoading: loadingServices } = useQuery({
    queryKey: ['/api/v1/services', selectedCategory, sortBy, priceRange, searchQuery],
  });

  const handleServiceBook = (serviceId: string) => {
    setLocation(`/services/${serviceId}/book`);
  };

  const handleAddToCart = (serviceId: string) => {
    const service = services?.find((s: Service) => s.id === serviceId);
    if (service) {
      setCartItems(prev => {
        const existing = prev.find(item => item.id === serviceId);
        if (existing) {
          return prev.map(item =>
            item.id === serviceId
              ? { ...item, quantity: item.quantity + 1 }
              : item
          );
        }
        return [...prev, {
          id: service.id,
          name: service.name,
          price: service.price,
          quantity: 1,
          type: 'service',
          category: service.category,
          icon: service.icon,
        }];
      });
    }
  };

  const handleApplyCoupon = async (code: string) => {
    return { success: false, message: 'Invalid coupon code' };
  };

  const handleProceedToCheckout = () => {
    setLocation('/checkout');
  };

  const filteredServices = services?.filter((service: Service) => {
    const matchesCategory = selectedCategory === 'all' || service.category === selectedCategory;
    const matchesSearch = !searchQuery || 
      service.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      service.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPrice = priceRange === 'all' || 
      (priceRange === 'low' && service.price <= 100) ||
      (priceRange === 'medium' && service.price > 100 && service.price <= 300) ||
      (priceRange === 'high' && service.price > 300);
    
    return matchesCategory && matchesSearch && matchesPrice;
  }) || [];

  const sortedServices = filteredServices.sort((a: Service, b: Service) => {
    switch (sortBy) {
      case 'price-low':
        return a.price - b.price;
      case 'price-high':
        return b.price - a.price;
      case 'rating':
        return b.rating - a.rating;
      case 'popular':
        return b.totalBookings - a.totalBookings;
      default:
        return 0;
    }
  });

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header
        onCartClick={() => setIsCartOpen(true)}
        cartItemsCount={cartItems.length}
      />

      <main className="pt-32 px-4 pb-6">
        {/* Page Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <h1 className="text-2xl font-bold text-foreground mb-2">Our Services</h1>
          <p className="text-muted-foreground">Find the perfect service for your needs</p>
        </motion.div>

        {/* Categories */}
        {categories && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-6"
          >
            <div className="flex space-x-3 overflow-x-auto pb-2">
              <Button
                variant={selectedCategory === 'all' ? 'default' : 'outline'}
                onClick={() => setSelectedCategory('all')}
                className="flex-shrink-0"
                data-testid="category-all"
              >
                All Services
              </Button>
              {categories.map((category: ServiceCategory) => (
                <Button
                  key={category.id}
                  variant={selectedCategory === category.id ? 'default' : 'outline'}
                  onClick={() => setSelectedCategory(category.id)}
                  className="flex-shrink-0"
                  data-testid={`category-${category.id}`}
                >
                  <span className="mr-2">{category.icon}</span>
                  {category.name}
                  <Badge variant="secondary" className="ml-2 text-xs">
                    {category.serviceCount}
                  </Badge>
                </Button>
              ))}
            </div>
          </motion.div>
        )}

        {/* Filters and Search */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-6"
        >
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row gap-4">
                {/* Search */}
                <div className="flex-1">
                  <Input
                    placeholder="Search services..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    data-testid="search-services"
                  />
                </div>

                {/* Sort */}
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-full md:w-40">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="rating">Highest Rated</SelectItem>
                    <SelectItem value="popular">Most Popular</SelectItem>
                    <SelectItem value="price-low">Price: Low to High</SelectItem>
                    <SelectItem value="price-high">Price: High to Low</SelectItem>
                  </SelectContent>
                </Select>

                {/* Price Range */}
                <Select value={priceRange} onValueChange={setPriceRange}>
                  <SelectTrigger className="w-full md:w-40">
                    <SelectValue placeholder="Price range" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Prices</SelectItem>
                    <SelectItem value="low">Under ₹100</SelectItem>
                    <SelectItem value="medium">₹100 - ₹300</SelectItem>
                    <SelectItem value="high">Above ₹300</SelectItem>
                  </SelectContent>
                </Select>

                {/* View Mode */}
                <div className="flex space-x-2">
                  <Button
                    variant={viewMode === 'list' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setViewMode('list')}
                    data-testid="list-view"
                  >
                    <List className="w-4 h-4" />
                  </Button>
                  <Button
                    variant={viewMode === 'grid' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setViewMode('grid')}
                    data-testid="grid-view"
                  >
                    <Grid className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Services List/Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          {loadingServices ? (
            <div className="space-y-4">
              {[...Array(6)].map((_, i) => (
                <ServiceCardSkeleton key={i} />
              ))}
            </div>
          ) : (
            <div className={viewMode === 'grid' ? 'grid grid-cols-2 gap-4' : 'space-y-4'}>
              {sortedServices.length > 0 ? (
                sortedServices.map((service: Service, index: number) => (
                  <motion.div
                    key={service.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <ServiceCard
                      id={service.id}
                      name={service.name}
                      description={service.description}
                      price={service.price}
                      rating={service.rating}
                      totalBookings={service.totalBookings}
                      icon={service.icon}
                      category={service.category}
                      estimatedDuration={service.estimatedDuration}
                      isAvailable={service.isActive}
                      onBook={handleServiceBook}
                      onAddToCart={handleAddToCart}
                      variant={viewMode === 'grid' ? 'compact' : 'default'}
                    />
                  </motion.div>
                ))
              ) : (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                    <Filter className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <h3 className="font-medium text-foreground mb-2">No services found</h3>
                  <p className="text-sm text-muted-foreground">
                    Try adjusting your filters or search terms
                  </p>
                </div>
              )}
            </div>
          )}
        </motion.div>
      </main>

      <CartSidebar
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        items={cartItems}
        onUpdateQuantity={(id, quantity) => {
          setCartItems(prev => prev.map(item => 
            item.id === id ? { ...item, quantity } : item
          ));
        }}
        onRemoveItem={(id) => {
          setCartItems(prev => prev.filter(item => item.id !== id));
        }}
        onApplyCoupon={handleApplyCoupon}
        onProceedToCheckout={handleProceedToCheckout}
      />

      <BottomNavigation />
    </div>
  );
}
