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
  // Mobile-optimized default height - smaller for mobile screens
  const [headerHeight, setHeaderHeight] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 640 ? 160 : 208; // Smaller default for mobile
    }
    return 208;
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

  // Use ResizeObserver for better performance than window resize
  useEffect(() => {
    if (!headerRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const newHeight = entry.contentRect.height;
        if (Math.abs(newHeight - headerHeight) > 2) {
          setHeaderHeight(newHeight);
          document.documentElement.style.setProperty('--header-height', `${newHeight}px`);
        }
      }
    });

    resizeObserver.observe(headerRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, [headerHeight]);

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

  // Set initial CSS variable
  useLayoutEffect(() => {
    document.documentElement.style.setProperty('--header-height', `${headerHeight}px`);
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

      {/* Main Content Area - Mobile optimized */}
      <motion.main 
        className="main-content"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        style={{
          paddingTop: showHeader ? 'var(--header-height, 160px)' : '0',
          paddingBottom: showBottomNav ? '5rem' : '1.5rem',
          minHeight: showHeader ? 'calc(100vh - var(--header-height, 160px))' : '100vh',
        }}
        data-testid="main-content"
      >
        {children}
      </motion.main>

      {/* Floating Cart Widget - only show when authenticated and has items */}
      {isAuthenticated && getItemCount() > 0 && (
        <FloatingCartWidget onClose={() => setIsCartOpen(false)} />
      )}

      {/* Bottom Navigation */}
      {showBottomNav && <BottomNavigation />}

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