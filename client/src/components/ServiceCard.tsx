import { motion } from 'framer-motion';
import { Star, Plus, Clock, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

interface ServiceCardProps {
  id: string;
  name: string;
  description?: string;
  price: number;
  rating?: number;
  totalBookings?: number;
  icon?: string; // Kept for backward compatibility
  iconType?: 'emoji' | 'image';
  iconValue?: string;
  category: string;
  estimatedDuration?: number;
  isAvailable?: boolean;
  onBook?: (serviceId: string) => void;
  onAddToCart?: (serviceId: string) => void;
  variant?: 'default' | 'compact' | 'featured';
  showBookButton?: boolean;
  showAddToCart?: boolean;
  context?: 'category' | 'direct'; // New prop to detect category context
}

// Helper component to render service icon with proper size handling
function ServiceIcon({ 
  iconType, 
  iconValue, 
  fallbackIcon = '🔧', 
  size = 'md',
  className = '',
  containerClassName = ''
}: {
  iconType?: 'emoji' | 'image';
  iconValue?: string;
  fallbackIcon?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  containerClassName?: string;
}) {
  // Define explicit size classes for consistent rendering
  const sizeClasses = {
    sm: { image: 'w-4 h-4', emoji: 'text-sm' },
    md: { image: 'w-6 h-6', emoji: 'text-xl' },
    lg: { image: 'w-8 h-8', emoji: 'text-2xl' }
  };
  
  const imageSize = sizeClasses[size].image;
  const emojiSize = sizeClasses[size].emoji;
  
  // Use new icon system if available, otherwise fallback to old icon prop
  if (iconType === 'image' && iconValue) {
    return (
      <img 
        src={iconValue} 
        alt="Service icon" 
        className={`object-cover rounded ${imageSize} ${className} ${containerClassName}`}
        onError={(e) => {
          // Fallback to emoji if image fails to load
          e.currentTarget.style.display = 'none';
          const fallback = e.currentTarget.parentElement?.querySelector('.icon-fallback') as HTMLElement;
          if (fallback) fallback.style.display = 'inline';
        }}
      />
    );
  }
  
  const displayIcon = (iconType === 'emoji' && iconValue) ? iconValue : fallbackIcon;
  return (
    <>
      {iconType === 'image' && iconValue && (
        <span className={`icon-fallback ${emojiSize} ${className}`} style={{ display: 'none' }}>
          {fallbackIcon}
        </span>
      )}
      <span className={`${iconType === 'image' ? 'icon-fallback' : ''} ${emojiSize} ${className}`}>
        {displayIcon}
      </span>
    </>
  );
}

export function ServiceCard({
  id,
  name,
  description,
  price,
  rating = 0,
  totalBookings = 0,
  icon = '🔧', // Kept for backward compatibility
  iconType,
  iconValue,
  category,
  estimatedDuration,
  isAvailable = true,
  onBook,
  onAddToCart,
  variant = 'default',
  showBookButton = true,
  showAddToCart = true,
  context = 'direct', // Default to direct access
}: ServiceCardProps) {
  const handleBook = () => {
    if (isAvailable && onBook) {
      onBook(id);
    }
  };

  const handleAddToCart = () => {
    if (isAvailable && onAddToCart) {
      onAddToCart(id);
    }
  };

  if (variant === 'compact') {
    return (
      <motion.div
        whileHover={{ scale: 1.02, y: -2 }}
        whileTap={{ scale: 0.98 }}
        className="service-card"
        data-testid={`service-card-${id}`}
      >
        <div className="text-center">
          <div className="w-12 h-12 bg-primary/10 rounded-lg mx-auto mb-3 flex items-center justify-center">
            <ServiceIcon 
              iconType={iconType} 
              iconValue={iconValue} 
              fallbackIcon={icon} 
              size="lg"
            />
          </div>
          <h3 className="font-medium text-sm text-foreground mb-1">{name}</h3>
          <p className="text-xs text-primary font-semibold">Starting ₹{price}</p>
          
          {rating > 0 && (
            <div className="flex items-center justify-center mt-1">
              <Star className="w-3 h-3 text-yellow-400 fill-current" />
              <span className="text-xs text-muted-foreground ml-1">{Number(rating).toFixed(1)}</span>
            </div>
          )}
        </div>
      </motion.div>
    );
  }

  if (variant === 'featured') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ scale: 1.02, y: -4 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      >
        <Card className="overflow-hidden border-primary/20 shadow-lg hover:shadow-xl transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-start space-x-4">
              <div className="w-16 h-16 bg-primary/10 rounded-xl flex items-center justify-center">
                <ServiceIcon 
                  iconType={iconType} 
                  iconValue={iconValue} 
                  fallbackIcon={icon} 
                  size="lg"
                />
              </div>
              
              <div className="flex-1">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-semibold text-foreground text-lg">{name}</h3>
                    {description && (
                      <p className="text-sm text-muted-foreground mt-1">{description}</p>
                    )}
                  </div>
                  
                  <Badge variant="secondary" className="text-xs">
                    {category}
                  </Badge>
                </div>
                
                <div className="flex items-center space-x-4 mb-3">
                  <div className="flex items-center space-x-1">
                    <span className="text-primary font-bold text-lg">₹{price}</span>
                  </div>
                  
                  {rating > 0 && (
                    <div className="flex items-center space-x-1">
                      <Star className="w-4 h-4 text-yellow-400 fill-current" />
                      <span className="text-sm font-medium">{Number(rating).toFixed(1)}</span>
                      <span className="text-xs text-muted-foreground">({totalBookings})</span>
                    </div>
                  )}
                  
                  {estimatedDuration && (
                    <div className="flex items-center space-x-1 text-muted-foreground">
                      <Clock className="w-4 h-4" />
                      <span className="text-xs">{estimatedDuration} min</span>
                    </div>
                  )}
                </div>
                
                <div className="flex space-x-2">
                  {showAddToCart && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleAddToCart}
                      disabled={!isAvailable}
                      className="flex-1"
                      data-testid={`add-to-cart-${id}`}
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Add to Cart
                    </Button>
                  )}
                  
                  {showBookButton && (
                    <Button
                      onClick={handleBook}
                      disabled={!isAvailable}
                      size="sm"
                      className="flex-1"
                      data-testid={`book-${id}`}
                    >
                      {context === 'category' ? 'Schedule Service' : 'Book Now'}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  // Default variant
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      className="bg-card border border-primary/20 rounded-lg p-4 hover:shadow-lg hover:shadow-primary/10 transition-all duration-300"
      data-testid={`service-card-${id}`}
    >
      <div className="flex items-center space-x-4">
        <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
          <ServiceIcon 
            iconType={iconType} 
            iconValue={iconValue} 
            fallbackIcon={icon} 
            size="md"
          />
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-foreground truncate">{name}</h3>
          {description && (
            <p className="text-sm text-muted-foreground line-clamp-1">{description}</p>
          )}
          
          <div className="flex items-center space-x-3 mt-2">
            <span className="text-primary font-semibold">₹{price}</span>
            
            {rating > 0 && (
              <div className="flex items-center space-x-1">
                <Star className="w-3 h-3 text-yellow-400 fill-current" />
                <span className="text-xs text-muted-foreground">{Number(rating).toFixed(1)}</span>
              </div>
            )}
            
            {estimatedDuration && (
              <div className="flex items-center space-x-1 text-muted-foreground">
                <Clock className="w-3 h-3" />
                <span className="text-xs">{estimatedDuration}m</span>
              </div>
            )}
          </div>
        </div>
        
        <div className="flex flex-col space-y-2">
          {showAddToCart && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleAddToCart}
              disabled={!isAvailable}
              className="text-xs px-3 py-1"
              data-testid={`add-to-cart-${id}`}
            >
              <Plus className="w-3 h-3" />
            </Button>
          )}
          
          {showBookButton && (
            <Button
              onClick={handleBook}
              disabled={!isAvailable}
              size="sm"
              className="text-xs px-3 py-1"
              data-testid={`book-${id}`}
            >
              {context === 'category' ? 'Schedule' : 'Book'}
            </Button>
          )}
        </div>
      </div>
      
      {!isAvailable && (
        <div className="mt-2 text-center">
          <Badge variant="destructive" className="text-xs">
            Currently Unavailable
          </Badge>
        </div>
      )}
    </motion.div>
  );
}

// Skeleton component for loading states
export function ServiceCardSkeleton({ variant = 'default' }: { variant?: 'default' | 'compact' | 'featured' }) {
  if (variant === 'compact') {
    return (
      <div className="service-card animate-pulse">
        <div className="text-center">
          <div className="w-12 h-12 bg-muted rounded-lg mx-auto mb-3"></div>
          <div className="h-4 bg-muted rounded w-20 mx-auto mb-1"></div>
          <div className="h-3 bg-muted rounded w-16 mx-auto"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-lg p-4 animate-pulse">
      <div className="flex items-center space-x-4">
        <div className="w-12 h-12 bg-muted rounded-lg flex-shrink-0"></div>
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-muted rounded w-3/4"></div>
          <div className="h-3 bg-muted rounded w-1/2"></div>
          <div className="flex space-x-3">
            <div className="h-3 bg-muted rounded w-12"></div>
            <div className="h-3 bg-muted rounded w-8"></div>
          </div>
        </div>
        <div className="w-16 h-8 bg-muted rounded"></div>
      </div>
    </div>
  );
}
