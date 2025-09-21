import { Switch, Route, useLocation } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { CartProvider } from "@/hooks/useCart";
import { WebSocketProvider } from "@/contexts/WebSocketContext";
import { PWASplashScreen } from "@/components/PWASplashScreen";
import { useEffect, lazy, Suspense, useState } from "react";
// Feature flag for i18n functionality
const I18N_ENABLED = import.meta.env.VITE_I18N_ENABLED === 'true';

// Lazy load LocalizationProvider only when i18n is enabled
const LocalizationProvider = I18N_ENABLED ? lazy(() => 
  import("@/contexts/LocalizationContext").then(module => ({ 
    default: module.LocalizationProvider 
  }))
) : null;

// Import pages
import Home from "@/pages/Home";
import Login from "@/pages/Login";
import AdminLogin from "@/pages/AdminLogin";
import ServiceProviderLogin from "@/pages/ServiceProviderLogin";
import PartsProviderLogin from "@/pages/PartsProviderLogin";
import Services from "@/pages/Services";
import ServiceBooking from "@/pages/ServiceBooking";
import Parts from "@/pages/Parts";
import PartDetail from "@/pages/PartDetail";
import SearchResults from "@/pages/SearchResults";
import Cart from "@/pages/Cart";
import Checkout from "@/pages/Checkout";
import PaymentMethods from "@/pages/PaymentMethods";
import Orders from "@/pages/Orders";
import OrderDetail from "@/pages/OrderDetail";
import Wallet from "@/pages/Wallet";
import Account from "@/pages/Account";
import AccountEdit from "@/pages/AccountEdit";
import Location from "@/pages/Location";
import Support from "@/pages/Support";
import ServiceProvider from "@/pages/ServiceProvider";
import PartsProvider from "@/pages/PartsProvider";
import Admin from "@/pages/Admin";
import Subcategories from "@/pages/Subcategories";
import NotFound from "@/pages/not-found";
import ProviderRegistration from "@/pages/ProviderRegistration";
import PartProviderRegistration from "@/pages/PartProviderRegistration";
import ProviderPending from "@/pages/ProviderPending";
import PartsProviderPending from "@/pages/PartsProviderPending";
import ProviderAuth from "@/pages/ProviderAuth";
import EnhancedProviderRegistration from "@/pages/EnhancedProviderRegistration";
import EnhancedPartsProviderRegistration from "@/pages/EnhancedPartsProviderRegistration";
import ServiceProviderDashboard from "@/pages/ProviderDashboard";
import PartsProviderDashboard from "@/pages/PartsProviderDashboard";
import LanguageRegion from "@/pages/LanguageRegion";
import ReferEarn from "@/pages/ReferEarn";
import HelpSupport from "@/pages/HelpSupport";
import LegalPrivacy from "@/pages/LegalPrivacy";
import ServiceRequest from "@/pages/ServiceRequest";

// Import components
import Layout, { MinimalLayout } from "@/components/Layout";

// Dashboard routing based on user role
const getDashboardRoute = (role: string) => {
  switch(role) {
    case 'service_provider': return '/service-provider-dashboard';
    case 'parts_provider': return '/parts-provider-dashboard';  
    case 'admin': return '/admin';
    default: return '/orders'; // Regular user
  }
};

// Smart home component that redirects specific role users to their dashboard
function SmartHome() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (isAuthenticated && user?.role && !isLoading) {
      // Only redirect specific role users to their dashboards
      // Regular users (role: 'user' or undefined) stay on home page
      if (user.role === 'service_provider') {
        setLocation('/service-provider-dashboard');
      } else if (user.role === 'parts_provider') {
        setLocation('/parts-provider-dashboard');
      } else if (user.role === 'admin') {
        setLocation('/admin');
      }
      // Regular users with role 'user' or no specific role stay on home page
    } else if (!isLoading && !isAuthenticated) {
      // Redirect unauthenticated users to login
      setLocation('/login');
    }
  }, [isAuthenticated, user?.role, isLoading, setLocation]);

  // Show loading spinner while auth is being determined
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="loading-spinner" />
      </div>
    );
  }

  // Show home for authenticated users (regular users stay here, others redirect via useEffect)
  return <Home />;
}

function ProtectedRoute({ component: Component, allowedRoles }: { 
  component: React.ComponentType; 
  allowedRoles?: string[];
}) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="loading-spinner" />
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role || 'user')) {
    return <Home />;
  }

  return <Component />;
}

function AdminProtectedRoute({ component: Component }: { 
  component: React.ComponentType; 
}) {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="loading-spinner" />
      </div>
    );
  }

  if (!user) {
    setLocation('/admin/login');
    return null;
  }

  if (user.role !== 'admin') {
    return <Home />;
  }

  return <Component />;
}

function PublicRoute({ component: Component }: { component: React.ComponentType }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="loading-spinner" />
      </div>
    );
  }

  if (isAuthenticated) {
    return <Home />;
  }

  return <Component />;
}

// Special route for provider login pages - allows authenticated users to access the component
// so they can be redirected based on their role
function ProviderRoute({ component: Component }: { component: React.ComponentType }) {
  const { isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="loading-spinner" />
      </div>
    );
  }

  // Always allow access to provider login components so they can handle role-based redirects
  return <Component />;
}

function Router() {
  return (
    <Switch>
      {/* Auth Routes - No layout wrapper */}
      <Route path="/login" component={() => <PublicRoute component={Login} />} />
      <Route path="/service-provider/login" component={() => <ProviderRoute component={ServiceProviderLogin} />} />
      <Route path="/parts-provider/login" component={() => <ProviderRoute component={PartsProviderLogin} />} />
      <Route path="/admin/login" component={() => <AdminLogin />} />
      
      {/* All other routes wrapped with Layout */}
      <Route path="/" component={() => <Layout><SmartHome /></Layout>} />
      <Route path="/services" component={() => <Layout><ProtectedRoute component={Services} /></Layout>} />
      <Route path="/services/:categoryId" component={() => <Layout><ProtectedRoute component={Services} /></Layout>} />
      <Route path="/services/:serviceId/book" component={() => <Layout><ProtectedRoute component={ServiceBooking} /></Layout>} />
      <Route path="/parts" component={() => <Layout><ProtectedRoute component={Parts} /></Layout>} />
      <Route path="/parts/:partId" component={() => <Layout><ProtectedRoute component={PartDetail} /></Layout>} />
      <Route path="/search" component={() => <Layout><ProtectedRoute component={SearchResults} /></Layout>} />
      <Route path="/cart" component={() => <Layout><ProtectedRoute component={Cart} /></Layout>} />
      <Route path="/checkout" component={() => <Layout><ProtectedRoute component={Checkout} /></Layout>} />
      <Route path="/orders" component={() => <Layout><ProtectedRoute component={Orders} /></Layout>} />
      <Route path="/orders/:orderId" component={() => <Layout><ProtectedRoute component={OrderDetail} /></Layout>} />
      <Route path="/wallet" component={() => <Layout><ProtectedRoute component={Wallet} /></Layout>} />
      <Route path="/payment-methods" component={() => <Layout><ProtectedRoute component={PaymentMethods} /></Layout>} />
      <Route path="/account" component={() => <Layout><ProtectedRoute component={Account} /></Layout>} />
      <Route path="/account/edit" component={() => <Layout><ProtectedRoute component={AccountEdit} /></Layout>} />
      <Route path="/account/language" component={() => <Layout><ProtectedRoute component={LanguageRegion} /></Layout>} />
      <Route path="/account/referral" component={() => <Layout><ProtectedRoute component={ReferEarn} /></Layout>} />
      <Route path="/support" component={() => <Layout><ProtectedRoute component={HelpSupport} /></Layout>} />
      <Route path="/legal" component={() => <Layout><ProtectedRoute component={LegalPrivacy} /></Layout>} />
      <Route path="/location" component={() => <Layout><ProtectedRoute component={Location} /></Layout>} />
      
      {/* Category Hierarchy Routes */}
      <Route path="/categories/:categoryId/subcategories" component={() => <Layout><ProtectedRoute component={Subcategories} /></Layout>} />
      
      {/* Service Request Route */}
      <Route path="/request-service" component={() => <Layout><ProtectedRoute component={ServiceRequest} /></Layout>} />
      
      {/* Provider Authentication and Registration Routes */}
      <Route path="/provider/auth" component={() => <ProviderAuth />} />
      <Route 
        path="/provider-registration" 
        component={() => <Layout><ProviderRegistration /></Layout>} 
      />
      <Route 
        path="/parts-provider-registration" 
        component={() => <Layout><PartProviderRegistration /></Layout>} 
      />
      
      {/* Enhanced Registration Routes with Google Auth */}
      <Route 
        path="/provider-registration-enhanced" 
        component={() => <Layout><EnhancedProviderRegistration /></Layout>} 
      />
      <Route 
        path="/parts-provider-registration-enhanced" 
        component={() => <Layout><EnhancedPartsProviderRegistration /></Layout>} 
      />
      <Route 
        path="/provider/register" 
        component={() => <Layout><ProtectedRoute component={ProviderRegistration} /></Layout>} 
      />
      <Route 
        path="/parts-provider/register" 
        component={() => <Layout><ProtectedRoute component={PartProviderRegistration} /></Layout>} 
      />
      <Route 
        path="/provider-pending" 
        component={() => <Layout><ProtectedRoute component={ProviderPending} /></Layout>} 
      />
      <Route 
        path="/parts-provider-pending" 
        component={() => <Layout><ProtectedRoute component={PartsProviderPending} /></Layout>} 
      />
      
      {/* Service Provider Routes */}
      <Route 
        path="/provider" 
        component={() => <Layout><ProtectedRoute component={ServiceProviderDashboard} allowedRoles={['service_provider']} /></Layout>} 
      />
      <Route 
        path="/service-provider-dashboard" 
        component={() => <Layout><ProtectedRoute component={ServiceProviderDashboard} allowedRoles={['service_provider']} /></Layout>} 
      />
      
      {/* Parts Provider Routes */}
      <Route 
        path="/parts-provider" 
        component={() => <Layout><ProtectedRoute component={PartsProviderDashboard} allowedRoles={['parts_provider']} /></Layout>} 
      />
      <Route 
        path="/parts-provider-dashboard" 
        component={() => <Layout><ProtectedRoute component={PartsProviderDashboard} allowedRoles={['parts_provider']} /></Layout>} 
      />
      
      {/* Admin Routes */}
      <Route 
        path="/admin" 
        component={() => <MinimalLayout><AdminProtectedRoute component={Admin} /></MinimalLayout>} 
      />
      <Route 
        path="/admin/dashboard" 
        component={() => <MinimalLayout><AdminProtectedRoute component={Admin} /></MinimalLayout>} 
      />
      <Route 
        path="/admin/users" 
        component={() => <MinimalLayout><AdminProtectedRoute component={Admin} /></MinimalLayout>} 
      />
      <Route 
        path="/admin/orders" 
        component={() => <MinimalLayout><AdminProtectedRoute component={Admin} /></MinimalLayout>} 
      />
      <Route 
        path="/admin/verifications" 
        component={() => <MinimalLayout><AdminProtectedRoute component={Admin} /></MinimalLayout>} 
      />
      
      {/* 404 Fallback */}
      <Route component={() => <Layout><NotFound /></Layout>} />
    </Switch>
  );
}

function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [appLoaded, setAppLoaded] = useState(false);

  // Accessibility: Check for reduced motion preference
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  useEffect(() => {
    // Performance: Pause animations when document is hidden
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Document is hidden, pause heavy animations if needed
        document.body.classList.add('app-hidden');
      } else {
        document.body.classList.remove('app-hidden');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  useEffect(() => {
    // Simulate app loading time or wait for critical resources
    const timer = setTimeout(() => {
      setAppLoaded(true);
    }, 1000); // Minimum splash duration

    return () => clearTimeout(timer);
  }, []);

  const handleSplashComplete = () => {
    setShowSplash(false);
  };

  const AppContent = (
    <CartProvider>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </CartProvider>
  );

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        {/* PWA Splash Screen */}
        <PWASplashScreen 
          isVisible={showSplash && !prefersReducedMotion}
          onComplete={handleSplashComplete}
          duration={prefersReducedMotion ? 1000 : 2500} // Shorter duration for reduced motion
        />
        
        {I18N_ENABLED && LocalizationProvider ? (
          <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="loading-spinner" /></div>}>
            <LocalizationProvider>
              <WebSocketProvider autoReconnect={true} reconnectInterval={3000} maxReconnectAttempts={10}>
                {AppContent}
              </WebSocketProvider>
            </LocalizationProvider>
          </Suspense>
        ) : (
          <WebSocketProvider autoReconnect={true} reconnectInterval={3000} maxReconnectAttempts={10}>
            {AppContent}
          </WebSocketProvider>
        )}
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
