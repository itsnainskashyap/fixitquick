import { Switch, Route, useLocation } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { CartProvider } from "@/hooks/useCart";
import { WebSocketProvider } from "@/contexts/WebSocketContext";
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
import ServiceProviderDashboard from "@/pages/ProviderDashboard";
import PartsProviderDashboard from "@/pages/PartsProviderDashboard";
import LanguageRegion from "@/pages/LanguageRegion";
import ReferEarn from "@/pages/ReferEarn";
import HelpSupport from "@/pages/HelpSupport";
import LegalPrivacy from "@/pages/LegalPrivacy";

// Import components
import { FloatingCartWidget } from "@/components/FloatingCartWidget";

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

function Router() {
  return (
    <Switch>
      {/* Public Routes */}
      <Route path="/login" component={() => <PublicRoute component={Login} />} />
      <Route path="/admin/login" component={AdminLogin} />
      
      {/* Smart Home Route - Redirects authenticated users to their role-based dashboard */}
      <Route path="/" component={SmartHome} />
      <Route path="/services" component={() => <ProtectedRoute component={Services} />} />
      <Route path="/services/:categoryId" component={() => <ProtectedRoute component={Services} />} />
      <Route path="/services/:serviceId/book" component={() => <ProtectedRoute component={ServiceBooking} />} />
      <Route path="/parts" component={() => <ProtectedRoute component={Parts} />} />
      <Route path="/parts/:partId" component={() => <ProtectedRoute component={PartDetail} />} />
      <Route path="/search" component={() => <ProtectedRoute component={SearchResults} />} />
      <Route path="/cart" component={() => <ProtectedRoute component={Cart} />} />
      <Route path="/checkout" component={() => <ProtectedRoute component={Checkout} />} />
      <Route path="/orders" component={() => <ProtectedRoute component={Orders} />} />
      <Route path="/orders/:orderId" component={() => <ProtectedRoute component={OrderDetail} />} />
      <Route path="/wallet" component={() => <ProtectedRoute component={Wallet} />} />
      <Route path="/payment-methods" component={() => <ProtectedRoute component={PaymentMethods} />} />
      <Route path="/account" component={() => <ProtectedRoute component={Account} />} />
      <Route path="/account/edit" component={() => <ProtectedRoute component={AccountEdit} />} />
      <Route path="/account/language" component={() => <ProtectedRoute component={LanguageRegion} />} />
      <Route path="/account/referral" component={() => <ProtectedRoute component={ReferEarn} />} />
      <Route path="/support" component={() => <ProtectedRoute component={HelpSupport} />} />
      <Route path="/legal" component={() => <ProtectedRoute component={LegalPrivacy} />} />
      <Route path="/location" component={() => <ProtectedRoute component={Location} />} />
      
      {/* Category Hierarchy Routes */}
      <Route path="/categories/:categoryId/subcategories" component={() => <ProtectedRoute component={Subcategories} />} />
      
      {/* Provider Registration Routes */}
      <Route 
        path="/provider/register" 
        component={() => <ProtectedRoute component={ProviderRegistration} />} 
      />
      <Route 
        path="/parts-provider/register" 
        component={() => <ProtectedRoute component={PartProviderRegistration} />} 
      />
      <Route 
        path="/provider-pending" 
        component={() => <ProtectedRoute component={ProviderPending} />} 
      />
      <Route 
        path="/parts-provider-pending" 
        component={() => <ProtectedRoute component={PartsProviderPending} />} 
      />
      
      {/* Service Provider Routes */}
      <Route 
        path="/provider" 
        component={() => <ProtectedRoute component={ServiceProviderDashboard} allowedRoles={['service_provider']} />} 
      />
      <Route 
        path="/service-provider-dashboard" 
        component={() => <ProtectedRoute component={ServiceProviderDashboard} allowedRoles={['service_provider']} />} 
      />
      
      {/* Parts Provider Routes */}
      <Route 
        path="/parts-provider" 
        component={() => <ProtectedRoute component={PartsProviderDashboard} allowedRoles={['parts_provider']} />} 
      />
      <Route 
        path="/parts-provider-dashboard" 
        component={() => <ProtectedRoute component={PartsProviderDashboard} allowedRoles={['parts_provider']} />} 
      />
      
      {/* Admin Routes */}
      <Route 
        path="/admin" 
        component={() => <AdminProtectedRoute component={Admin} />} 
      />
      <Route 
        path="/admin/dashboard" 
        component={() => <AdminProtectedRoute component={Admin} />} 
      />
      <Route 
        path="/admin/users" 
        component={() => <AdminProtectedRoute component={Admin} />} 
      />
      <Route 
        path="/admin/orders" 
        component={() => <AdminProtectedRoute component={Admin} />} 
      />
      <Route 
        path="/admin/verifications" 
        component={() => <AdminProtectedRoute component={Admin} />} 
      />
      
      {/* 404 Fallback */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const AppContent = (
    <CartProvider>
      <TooltipProvider>
        <Toaster />
        <Router />
        <FloatingCartWidget />
      </TooltipProvider>
    </CartProvider>
  );

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
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
