import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useLocation } from 'wouter';
import { Header } from '@/components/Header';
import { ServiceCard } from '@/components/ServiceCard';
import { CartSidebar } from '@/components/CartSidebar';
import { BottomNavigation } from '@/components/BottomNavigation';
import { PWAInstallPrompt } from '@/components/PWAInstallPrompt';
import { useAuth } from '@/hooks/useAuth';
import { useCart } from '@/hooks/useCart';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { Sparkles, TrendingUp, Clock, Star } from 'lucide-react';

interface ServiceCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  isActive: boolean;
  createdAt: string;
}

interface SuggestedService {
  id: string;
  name: string;
  description: string;
  price: number;
  rating: number;
  icon: string;
  category: string;
}

interface RecentOrder {
  id: string;
  serviceName: string;
  status: 'pending' | 'completed' | 'cancelled';
  amount: number;
  completedAt?: string;
  icon: string;
}

// Fetch service categories dynamically from backend

export default function Home() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { addItem, getItemCount } = useCart();
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Fetch main categories (level 0) from backend for home page
  const { data: serviceCategories = [], isLoading: loadingCategories } = useQuery<ServiceCategory[]>({
    queryKey: ['/api/v1/services/categories/main'],
  });

  // Fetch suggested services
  const { data: suggestedServices = [], isLoading: loadingSuggestions } = useQuery<SuggestedService[]>({
    queryKey: ['/api/v1/services/suggested'],
    enabled: !!user,
  });

  // Fetch recent orders
  const { data: recentOrders = [], isLoading: loadingOrders } = useQuery<RecentOrder[]>({
    queryKey: ['/api/v1/orders/recent'],
    enabled: !!user,
  });

  // Fetch wallet balance
  const { data: walletData = { balance: 0 } } = useQuery<{ balance: number }>({
    queryKey: ['/api/v1/wallet/balance'],
    enabled: !!user,
  });

  const handleServiceBook = (serviceId: string) => {
    setLocation(`/services/${serviceId}/book`);
  };

  const handleAddToCart = (serviceId: string) => {
    // Find service in suggested services or static data
    const suggestedService = suggestedServices.find((s: SuggestedService) => s.id === serviceId);
    if (suggestedService) {
      addItem({
        id: suggestedService.id,
        serviceId: suggestedService.id,
        name: suggestedService.name,
        description: suggestedService.description,
        price: suggestedService.price,
        type: 'service',
        category: suggestedService.category,
        icon: suggestedService.icon,
      });
    }
  };

  const handleCategoryClick = (categoryId: string) => {
    // Navigate to subcategories for the selected main category
    setLocation(`/categories/${categoryId}/subcategories`);
  };

  const handleEmergencyClick = () => {
    setLocation('/emergency');
  };

  const handleLocationClick = () => {
    setLocation('/location');
  };


  const getUserGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
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
      <PWAInstallPrompt />
      
      <Header
        onCartClick={() => setIsCartOpen(true)}
        onLocationClick={handleLocationClick}
        onEmergencyClick={handleEmergencyClick}
        cartItemsCount={getItemCount()}
      />

      <main className="pt-32 px-4 pb-6">
        {/* Welcome Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <h1 className="text-2xl font-bold text-foreground mb-2">
            {getUserGreeting()}, {user.firstName || 'there'}! 👋
          </h1>
          <p className="text-muted-foreground">What can we fix for you today?</p>
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-6"
        >
          <div className="flex space-x-3 overflow-x-auto pb-2">
            <Button
              onClick={() => setLocation('/services')}
              className="flex-shrink-0"
              data-testid="book-now-button"
            >
              Book Now
            </Button>
            <Button
              variant="secondary"
              onClick={() => setLocation('/orders')}
              className="flex-shrink-0"
              data-testid="track-order-button"
            >
              Track Order
            </Button>
            <Button
              variant="secondary"
              onClick={() => setLocation('/wallet')}
              className="flex-shrink-0"
              data-testid="wallet-button"
            >
              Wallet: ₹{walletData.balance}
            </Button>
          </div>
        </motion.div>

        {/* Service Categories Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">Main Categories</h2>
            <Button
              variant="ghost"
              onClick={() => setLocation('/services')}
              className="text-primary text-sm font-medium"
              data-testid="view-all-services"
            >
              View All
            </Button>
          </div>
          
          {serviceCategories.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {serviceCategories.map((category, index) => (
                <motion.div
                  key={category.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.1 }}
                  onClick={() => handleCategoryClick(category.id)}
                  className="service-card"
                  data-testid={`category-${category.id}`}
                >
                  <div className="w-12 h-12 bg-primary/10 rounded-lg mx-auto mb-3 flex items-center justify-center">
                    <span className="text-2xl">{category.icon || '🔧'}</span>
                  </div>
                  <h3 className="font-medium text-sm text-foreground">{category.name}</h3>
                  <p className="text-xs text-muted-foreground mt-1">{category.description || 'Professional service'}</p>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12" data-testid="empty-services-state">
              <div className="w-16 h-16 bg-muted/20 rounded-full mx-auto mb-4 flex items-center justify-center">
                <span className="text-2xl">🔧</span>
              </div>
              <h3 className="font-medium text-foreground mb-2">No Categories Available</h3>
              <p className="text-sm text-muted-foreground mb-4">
                We're setting up our service categories. Please check back soon!
              </p>
              <Button
                onClick={() => setLocation('/services')}
                variant="outline"
                data-testid="browse-services-button"
              >
                Browse Services
              </Button>
            </div>
          )}
        </motion.div>

        {/* AI Suggested Services */}
        {suggestedServices.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mb-6"
          >
            <div className="flex items-center space-x-2 mb-4">
              <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center">
                <Sparkles className="w-3 h-3 text-primary" />
              </div>
              <h2 className="text-lg font-semibold text-foreground">Suggested For You</h2>
            </div>
            
            <div className="space-y-3">
              {suggestedServices.slice(0, 3).map((service, index) => (
                <motion.div
                  key={service.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <ServiceCard
                    id={service.id}
                    name={service.name}
                    description={service.description}
                    price={service.price}
                    rating={service.rating}
                    icon={service.icon}
                    category={service.category}
                    onBook={handleServiceBook}
                    onAddToCart={handleAddToCart}
                    variant="default"
                  />
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Parts Shop Teaser */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mb-6"
        >
          <Card className="bg-gradient-to-r from-primary/10 to-accent/10 border-primary/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-foreground mb-1">Need Parts?</h3>
                  <p className="text-sm text-muted-foreground">Browse electrical & plumbing parts</p>
                </div>
                <div className="text-right">
                  <div className="text-2xl mb-1">🔧</div>
                  <Button
                    onClick={() => setLocation('/parts')}
                    size="sm"
                    data-testid="shop-parts-button"
                  >
                    Shop Parts
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Recent Orders */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mb-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">Recent Orders</h2>
            <Button
              variant="ghost"
              onClick={() => setLocation('/orders')}
              className="text-primary text-sm font-medium"
              data-testid="view-all-orders"
            >
              View All
            </Button>
          </div>
          
          {recentOrders.length > 0 ? (
            <div className="space-y-3">
              {recentOrders.slice(0, 2).map((order, index) => (
                <motion.div
                  key={order.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                            <span className="text-sm">{order.icon}</span>
                          </div>
                          <div>
                            <h3 className="font-medium text-foreground text-sm">{order.serviceName}</h3>
                            <p className="text-xs text-muted-foreground">Order #{order.id.slice(-6)}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge
                            variant={order.status === 'completed' ? 'default' : order.status === 'pending' ? 'secondary' : 'destructive'}
                            className="text-xs"
                          >
                            {order.status}
                          </Badge>
                          <p className="text-xs text-muted-foreground mt-1">₹{order.amount}</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-muted-foreground">
                          {order.completedAt ? `Completed on ${new Date(order.completedAt).toLocaleDateString()}` : 'In progress'}
                        </p>
                        <div className="flex space-x-2">
                          {order.status === 'completed' && (
                            <>
                              <Button variant="ghost" size="sm" className="text-xs text-primary">
                                Rate
                              </Button>
                              <Button variant="ghost" size="sm" className="text-xs text-primary">
                                Reorder
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8" data-testid="empty-orders-state">
              <div className="w-12 h-12 bg-muted/20 rounded-full mx-auto mb-3 flex items-center justify-center">
                <Clock className="w-5 h-5 text-muted-foreground" />
              </div>
              <h3 className="font-medium text-foreground mb-1">No Recent Orders</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Book your first service to see your order history here
              </p>
              <Button
                onClick={() => setLocation('/services')}
                size="sm"
                data-testid="book-first-service-button"
              >
                Book a Service
              </Button>
            </div>
          )}
        </motion.div>
      </main>

      <CartSidebar
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
      />

      <BottomNavigation />
    </div>
  );
}
