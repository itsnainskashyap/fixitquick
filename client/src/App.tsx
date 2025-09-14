import { Switch, Route, useLocation } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { CartProvider } from "@/hooks/useCart";
import { WebSocketProvider } from "@/contexts/WebSocketContext";
import { useEffect } from "react";

// Import pages
import Home from "@/pages/Home";
import Login from "@/pages/Login";
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
import ServiceProvider from "@/pages/ServiceProvider";
import PartsProvider from "@/pages/PartsProvider";
import Admin from "@/pages/Admin";
import NotFound from "@/pages/not-found";

// Dashboard routing based on user role
const getDashboardRoute = (role: string) => {
  switch(role) {
    case 'service_provider': return '/provider';
    case 'parts_provider': return '/parts-provider';  
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
        setLocation('/provider');
      } else if (user.role === 'parts_provider') {
        setLocation('/parts-provider');
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
      
      {/* Smart Home Route - Redirects authenticated users to their role-based dashboard */}
      <Route path="/" component={SmartHome} />
      <Route path="/services" component={() => <ProtectedRoute component={Services} />} />
      <Route path="/services/:categoryId" component={() => <ProtectedRoute component={Services} />} />
      <Route path="/services/:serviceId/book" component={() => <ProtectedRoute component={ServiceBooking} />} />
      <Route path="/parts" component={() => <ProtectedRoute component={Parts} />} />
      <Route path="/parts/:partId" component={() => <ProtectedRoute component={PartDetail} />} />
      <Route path="/search" component={() => <ProtectedRoute component={SearchResults} />} />
      <Route path="/search/:query*" component={() => <ProtectedRoute component={SearchResults} />} />
      <Route path="/cart" component={() => <ProtectedRoute component={Cart} />} />
      <Route path="/checkout" component={() => <ProtectedRoute component={Checkout} />} />
      <Route path="/orders" component={() => <ProtectedRoute component={Orders} />} />
      <Route path="/orders/:orderId" component={() => <ProtectedRoute component={OrderDetail} />} />
      <Route path="/wallet" component={() => <ProtectedRoute component={Wallet} />} />
      <Route path="/payment-methods" component={() => <ProtectedRoute component={PaymentMethods} />} />
      <Route path="/account" component={() => <ProtectedRoute component={Account} />} />
      <Route path="/account/edit" component={() => <ProtectedRoute component={AccountEdit} />} />
      <Route path="/location" component={() => <ProtectedRoute component={Location} />} />
      
      {/* Service Provider Routes */}
      <Route 
        path="/provider" 
        component={() => <ProtectedRoute component={ServiceProvider} allowedRoles={['service_provider']} />} 
      />
      <Route 
        path="/provider/dashboard" 
        component={() => <ProtectedRoute component={ServiceProvider} allowedRoles={['service_provider']} />} 
      />
      
      {/* Parts Provider Routes */}
      <Route 
        path="/parts-provider" 
        component={() => <ProtectedRoute component={PartsProvider} allowedRoles={['parts_provider']} />} 
      />
      <Route 
        path="/parts-provider/dashboard" 
        component={() => <ProtectedRoute component={PartsProvider} allowedRoles={['parts_provider']} />} 
      />
      
      {/* Admin Routes */}
      <Route 
        path="/admin" 
        component={() => <ProtectedRoute component={Admin} allowedRoles={['admin']} />} 
      />
      <Route 
        path="/admin/dashboard" 
        component={() => <ProtectedRoute component={Admin} allowedRoles={['admin']} />} 
      />
      <Route 
        path="/admin/users" 
        component={() => <ProtectedRoute component={Admin} allowedRoles={['admin']} />} 
      />
      <Route 
        path="/admin/orders" 
        component={() => <ProtectedRoute component={Admin} allowedRoles={['admin']} />} 
      />
      <Route 
        path="/admin/verifications" 
        component={() => <ProtectedRoute component={Admin} allowedRoles={['admin']} />} 
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
      </TooltipProvider>
    </CartProvider>
  );

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <WebSocketProvider autoReconnect={true} reconnectInterval={3000} maxReconnectAttempts={10}>
          {AppContent}
        </WebSocketProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
