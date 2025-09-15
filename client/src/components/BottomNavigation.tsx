import { motion } from 'framer-motion';
import { useLocation } from 'wouter';
import { 
  Home, 
  Wrench, 
  Package,
  ClipboardList, 
  CreditCard, 
  User,
  Badge
} from 'lucide-react';

interface NavigationItem {
  id: string;
  label: string;
  icon: React.ComponentType<any>;
  path: string;
  badge?: number;
}

const navigationItems: NavigationItem[] = [
  {
    id: 'home',
    label: 'Home',
    icon: Home,
    path: '/',
  },
  {
    id: 'services',
    label: 'Services',
    icon: Wrench,
    path: '/services',
  },
  {
    id: 'parts',
    label: 'Parts',
    icon: Package,
    path: '/parts',
  },
  {
    id: 'orders',
    label: 'Orders',
    icon: ClipboardList,
    path: '/orders',
  },
  {
    id: 'wallet',
    label: 'Wallet',
    icon: CreditCard,
    path: '/wallet',
  },
  {
    id: 'account',
    label: 'Account',
    icon: User,
    path: '/account',
  },
];

export function BottomNavigation() {
  const [location, setLocation] = useLocation();

  const handleNavigation = (path: string) => {
    setLocation(path);
  };

  return (
    <motion.nav
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      transition={{ type: 'spring', damping: 20, stiffness: 300 }}
      className="fixed bottom-0 left-0 right-0 bg-background border-t border-border z-40 safe-bottom"
      data-testid="bottom-navigation"
    >
      <div className="flex items-center justify-around py-2 px-2">
        {navigationItems.map((item) => {
          const Icon = item.icon;
          const isActive = location === item.path;
          
          return (
            <motion.button
              key={item.id}
              onClick={() => handleNavigation(item.path)}
              className={`bottom-nav-item ${isActive ? 'active' : ''}`}
              whileTap={{ scale: 0.95 }}
              data-testid={`nav-${item.id}`}
            >
              <motion.div
                className="relative"
                animate={{
                  scale: isActive ? 1.1 : 1,
                }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              >
                <Icon className="w-6 h-6" />
                
                {/* Badge for notifications */}
                {item.badge && item.badge > 0 && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-2 -right-2 bg-primary text-primary-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center min-w-[1.25rem]"
                    data-testid={`badge-${item.id}`}
                  >
                    {item.badge > 99 ? '99+' : item.badge}
                  </motion.div>
                )}

                {/* Active indicator */}
                {isActive && (
                  <motion.div
                    layoutId="activeIndicator"
                    className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-primary rounded-full"
                    transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                  />
                )}
              </motion.div>
              
              <span className="text-xs font-medium mt-1">{item.label}</span>
            </motion.button>
          );
        })}
      </div>
    </motion.nav>
  );
}

// Hook for managing bottom navigation state
export function useBottomNavigation() {
  const [location] = useLocation();
  
  const getCurrentTab = () => {
    const currentItem = navigationItems.find(item => item.path === location);
    return currentItem?.id || 'home';
  };

  const getTabBadge = (tabId: string) => {
    const item = navigationItems.find(item => item.id === tabId);
    return item?.badge || 0;
  };

  return {
    currentTab: getCurrentTab(),
    getTabBadge,
    navigationItems,
  };
}
