import { useState } from 'react';
import { motion } from 'framer-motion';
import { useLocation, useRoute } from 'wouter';
import { Header } from '@/components/Header';
import { BottomNavigation } from '@/components/BottomNavigation';
import { CartSidebar } from '@/components/CartSidebar';
import { useAuth } from '@/hooks/useAuth';
import { useCart } from '@/hooks/useCart';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { ChevronLeft, ChevronRight, Layers } from 'lucide-react';

interface ServiceCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  isActive: boolean;
  level: number;
  parentId?: string;
  subCategoriesCount?: number;
  serviceCount?: number;
}

export default function Subcategories() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { getItemCount } = useCart();
  const [isCartOpen, setIsCartOpen] = useState(false);
  
  // Extract categoryId from route params
  const [match, params] = useRoute('/categories/:categoryId/subcategories');
  const categoryId = match ? params?.categoryId : undefined;

  // Fetch subcategories for the main category
  const { data: subcategories = [], isLoading: loadingSubcategories } = useQuery<ServiceCategory[]>({
    queryKey: ['/api/v1/service-categories', categoryId],
    queryFn: async () => {
      if (!categoryId) return [];
      const response = await apiRequest('GET', `/api/v1/service-categories?parentId=${categoryId}`);
      return response.data || response; // Handle both API response formats
    },
    enabled: !!categoryId,
  });

  // Fetch main category details to show in breadcrumb  
  const { data: mainCategories = [], isLoading: loadingMainCategory } = useQuery<ServiceCategory[]>({
    queryKey: ['/api/v1/service-categories', 'main'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/v1/service-categories?level=0');
      return response.data || response; // Handle both API response formats
    },
    enabled: !!categoryId,
  });
  
  // Find the main category from the list
  const mainCategory = mainCategories.find(cat => cat.id === categoryId);

  const handleSubcategoryClick = (subcategoryId: string) => {
    // Navigate to services filtered by subcategory
    setLocation(`/services?category=${subcategoryId}`);
  };

  const handleBackToHome = () => {
    setLocation('/');
  };

  const handleLocationClick = () => {
    setLocation('/location');
  };


  // Auth is handled by the ProtectedRoute wrapper in App.tsx
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="loading-spinner" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header
        onCartClick={() => setIsCartOpen(true)}
        onLocationClick={handleLocationClick}
        cartItemsCount={getItemCount()}
      />

      <main className="px-4 pb-6" style={{ paddingTop: 'var(--header-height, 160px)' }}>
        {/* Breadcrumb Navigation */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <nav className="flex items-center space-x-2 text-sm text-muted-foreground mb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBackToHome}
              className="p-1 h-auto text-primary"
              data-testid="back-to-home"
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Home
            </Button>
            <ChevronRight className="w-4 h-4" />
            <span className="text-foreground font-medium">
              {loadingMainCategory ? 'Loading...' : mainCategory?.name || 'Category'}
            </span>
          </nav>
          
          <div>
            <h1 className="text-2xl font-bold text-foreground mb-2">
              {loadingMainCategory ? 'Loading...' : `${mainCategory?.name || 'Category'} Services`}
            </h1>
            <p className="text-muted-foreground">
              Choose a subcategory to explore our {mainCategory?.name?.toLowerCase() || 'services'}
            </p>
          </div>
        </motion.div>

        {/* Subcategories Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-6"
        >
          {loadingSubcategories ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {[...Array(6)].map((_, index) => (
                <div key={index} className="bg-muted/20 rounded-lg p-4 animate-pulse">
                  <div className="w-12 h-12 bg-muted rounded-lg mx-auto mb-3"></div>
                  <div className="h-4 bg-muted rounded mb-2"></div>
                  <div className="h-3 bg-muted rounded w-3/4 mx-auto"></div>
                </div>
              ))}
            </div>
          ) : subcategories.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
              {subcategories.map((subcategory, index) => (
                <motion.div
                  key={subcategory.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.1 }}
                  onClick={() => handleSubcategoryClick(subcategory.id)}
                  className="service-card group"
                  data-testid={`subcategory-${subcategory.id}`}
                >
                  <Card className="h-full transition-all duration-200 group-hover:shadow-md group-hover:scale-105 cursor-pointer">
                    <CardContent className="p-3 sm:p-4 text-center">
                      <div className="w-12 h-12 bg-primary/10 rounded-lg mx-auto mb-3 flex items-center justify-center">
                        <span className="text-2xl">{subcategory.icon || '🔧'}</span>
                      </div>
                      <h3 className="font-medium text-sm text-foreground mb-2 line-clamp-2 min-h-[2.5rem] leading-tight">{subcategory.name}</h3>
                      <p className="text-xs text-muted-foreground mb-3 line-clamp-2 min-h-[2rem] leading-relaxed">
                        {subcategory.description || 'Professional service'}
                      </p>
                      <div className="flex flex-wrap items-center justify-center gap-1.5">
                        <Badge variant="outline" className="text-[10px] sm:text-xs px-2 py-0.5 whitespace-nowrap">
                          {subcategory.serviceCount || 0} services
                        </Badge>
                        {subcategory.isActive && (
                          <Badge variant="default" className="text-[10px] sm:text-xs px-2 py-0.5 whitespace-nowrap">
                            Available
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12" data-testid="empty-subcategories-state">
              <div className="w-16 h-16 bg-muted/20 rounded-full mx-auto mb-4 flex items-center justify-center">
                <Layers className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="font-medium text-foreground mb-2">No Subcategories Available</h3>
              <p className="text-sm text-muted-foreground mb-4">
                This category doesn't have any subcategories yet.
              </p>
              <div className="flex space-x-3 justify-center">
                <Button
                  onClick={handleBackToHome}
                  variant="outline"
                  data-testid="back-to-categories-button"
                >
                  <ChevronLeft className="w-4 h-4 mr-2" />
                  Back to Categories
                </Button>
                <Button
                  onClick={() => setLocation(`/services?category=${categoryId}`)}
                  data-testid="view-all-services-button"
                >
                  View All Services
                </Button>
              </div>
            </div>
          )}
        </motion.div>

        {/* Direct to All Services Option */}
        {!loadingSubcategories && subcategories.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mb-6"
          >
            <Card className="bg-gradient-to-r from-primary/5 to-accent/5 border-primary/20">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-foreground mb-1">View All Services</h3>
                    <p className="text-sm text-muted-foreground">
                      Browse all {mainCategory?.name?.toLowerCase() || 'services'} in one place
                    </p>
                  </div>
                  <Button
                    onClick={() => setLocation(`/services?category=${categoryId}`)}
                    size="sm"
                    data-testid="view-all-main-category-services"
                  >
                    Browse All
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </main>

      <CartSidebar
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
      />

      <BottomNavigation />
    </div>
  );
}