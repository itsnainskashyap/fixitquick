import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Header } from '@/components/Header';
import { CartSidebar } from '@/components/CartSidebar';
import { BottomNavigation } from '@/components/BottomNavigation';
import { PWAInstallPrompt } from '@/components/PWAInstallPrompt';
import { FloatingCartWidget } from '@/components/FloatingCartWidget';
import { useCart } from '@/hooks/useCart';
import { useAuth } from '@/hooks/useAuth';
import { useLocation } from 'wouter';

interface LayoutProps {
  children: React.ReactNode;
  showHeader?: boolean;
  showBottomNav?: boolean;
  showPWAPrompt?: boolean;
}

export function Layout({ 
  children, 
  showHeader = true, 
  showBottomNav = true,
  showPWAPrompt = true
}: LayoutProps) {
  const headerRef = useRef<HTMLDivElement>(null);
  const bottomNavRef = useRef<HTMLDivElement>(null);
  const lastHeaderHeight = useRef<number>(0);
  const lastBottomNavHeight = useRef<number>(0);
  
  // Consistent height management - mobile-first approach with extra padding
  const [headerHeight, setHeaderHeight] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 640 ? 220 : 280; // Much higher defaults to prevent overlap
    }
    return 280;
  });
  
  // Bottom navigation height tracking for precise spacing
  const [bottomNavHeight, setBottomNavHeight] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 640 ? 72 : 80; // Mobile-optimized bottom nav height
    }
    return 80;
  });
  
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [, setRouterLocation] = useLocation();
  
  const { getItemCount } = useCart();
  const { isAuthenticated } = useAuth();

  // Measure header height and update CSS variable
  const updateHeaderHeight = () => {
    if (headerRef.current) {
      const rect = headerRef.current.getBoundingClientRect();
      const newHeight = rect.height;
      
      // Only update if height has significantly changed (avoid micro-adjustments)
      if (Math.abs(newHeight - headerHeight) > 2) {
        setHeaderHeight(newHeight);
        // Set CSS custom property on document root
        document.documentElement.style.setProperty('--header-height', `${newHeight}px`);
      }
    }
  };

  // Optimized ResizeObserver for header - measures total height including safe-area
  useEffect(() => {
    if (!headerRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        // Use getBoundingClientRect() to get total height including safe-area padding
        const rect = entry.target.getBoundingClientRect();
        const newHeight = rect.height;
        // Use ref to prevent dependency on state that causes resubscription
        if (Math.abs(newHeight - lastHeaderHeight.current) > 2) {
          lastHeaderHeight.current = newHeight;
          setHeaderHeight(newHeight);
          document.documentElement.style.setProperty('--header-height', `${newHeight}px`);
        }
      }
    });

    resizeObserver.observe(headerRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, []); // No dependencies to prevent unnecessary resubscriptions

  // Optimized ResizeObserver for bottom navigation - measures total height including safe-area
  useEffect(() => {
    if (!showBottomNav) {
      // Handle showBottomNav=false case by setting height to 0
      document.documentElement.style.setProperty('--bottom-nav-height', '0px');
      setBottomNavHeight(0);
      return;
    }

    if (!bottomNavRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        // Use getBoundingClientRect() to get total height including safe-area padding
        const rect = entry.target.getBoundingClientRect();
        const newHeight = rect.height;
        // Use ref to prevent dependency on state that causes resubscription
        if (Math.abs(newHeight - lastBottomNavHeight.current) > 2) {
          lastBottomNavHeight.current = newHeight;
          setBottomNavHeight(newHeight);
          document.documentElement.style.setProperty('--bottom-nav-height', `${newHeight}px`);
        }
      }
    });

    resizeObserver.observe(bottomNavRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, [showBottomNav]); // Only depend on showBottomNav visibility

  // Initial header height measurement
  useLayoutEffect(() => {
    updateHeaderHeight();
  }, []);

  // Update height when content changes that might affect header size
  useEffect(() => {
    // Small delay to allow DOM updates to complete
    const timeoutId = setTimeout(updateHeaderHeight, 50);
    return () => clearTimeout(timeoutId);
  }, [isAuthenticated]); // Dependencies that might change header content

  // Handle location navigation from header
  const handleLocationClick = () => {
    setRouterLocation('/location');
  };

  // Handle cart actions
  const handleCartClick = () => {
    setIsCartOpen(true);
  };

  // Set initial CSS variables for dynamic spacing
  useLayoutEffect(() => {
    document.documentElement.style.setProperty('--header-height', `${headerHeight}px`);
    document.documentElement.style.setProperty('--bottom-nav-height', showBottomNav ? `${bottomNavHeight}px` : '0px');
    lastHeaderHeight.current = headerHeight;
    lastBottomNavHeight.current = bottomNavHeight;
  }, []);

  return (
    <div className="layout-container min-h-screen bg-background">
      {/* PWA Install Prompt */}
      {showPWAPrompt && <PWAInstallPrompt />}
      
      {/* Header */}
      {showHeader && (
        <div ref={headerRef} className="header-container">
          <Header
            onCartClick={handleCartClick}
            onLocationClick={handleLocationClick}
            cartItemsCount={getItemCount()}
          />
        </div>
      )}

      {/* Main Content Area - Fully responsive with consistent spacing */}
      <motion.main 
        className="main-content px-4 sm:px-6 lg:px-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        style={{
          paddingTop: showHeader ? `calc(var(--header-height, 280px) + 2rem)` : '0',
          paddingBottom: showBottomNav ? 'calc(var(--bottom-nav-height, 80px) + var(--safe-area-inset-bottom, 0px) + 1rem)' : '1.5rem',
          minHeight: showHeader 
            ? showBottomNav 
              ? 'calc(100vh - var(--header-height, 280px) - var(--bottom-nav-height, 80px) - var(--safe-area-inset-bottom, 0px))'
              : 'calc(100vh - var(--header-height, 280px))'
            : showBottomNav
              ? 'calc(100vh - var(--bottom-nav-height, 80px) - var(--safe-area-inset-bottom, 0px))'
              : '100vh',
        }}
        data-testid="main-content"
      >
        {children}
      </motion.main>

      {/* Floating Cart Widget - handles its own visibility logic */}
      <FloatingCartWidget onClose={() => setIsCartOpen(false)} />

      {/* Bottom Navigation */}
      {showBottomNav && (
        <BottomNavigation ref={bottomNavRef} />
      )}

      {/* Cart Sidebar */}
      <CartSidebar 
        isOpen={isCartOpen} 
        onClose={() => setIsCartOpen(false)} 
      />
    </div>
  );
}

// Export a simpler wrapper for pages that need custom layout options
export function MinimalLayout({ children }: { children: React.ReactNode }) {
  return (
    <Layout showHeader={false} showBottomNav={false} showPWAPrompt={false}>
      {children}
    </Layout>
  );
}

export default Layout;