import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { CartProvider } from "@/hooks/useCart";

// Import pages
import Home from "@/pages/Home";
import Login from "@/pages/Login";
import Services from "@/pages/Services";
import ServiceBooking from "@/pages/ServiceBooking";
import Cart from "@/pages/Cart";
import Checkout from "@/pages/Checkout";
import Orders from "@/pages/Orders";
import OrderDetail from "@/pages/OrderDetail";
import Wallet from "@/pages/Wallet";
import Account from "@/pages/Account";
import ServiceProvider from "@/pages/ServiceProvider";
import PartsProvider from "@/pages/PartsProvider";
import Admin from "@/pages/Admin";
import NotFound from "@/pages/not-found";

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
      
      {/* Public Routes - Allow guest browsing */}
      <Route path="/" component={Home} />
      <Route path="/services" component={() => <ProtectedRoute component={Services} />} />
      <Route path="/services/:categoryId" component={() => <ProtectedRoute component={Services} />} />
      <Route path="/services/:serviceId/book" component={() => <ProtectedRoute component={ServiceBooking} />} />
      <Route path="/cart" component={() => <ProtectedRoute component={Cart} />} />
      <Route path="/checkout" component={() => <ProtectedRoute component={Checkout} />} />
      <Route path="/orders" component={() => <ProtectedRoute component={Orders} />} />
      <Route path="/orders/:orderId" component={() => <ProtectedRoute component={OrderDetail} />} />
      <Route path="/wallet" component={() => <ProtectedRoute component={Wallet} />} />
      <Route path="/account" component={() => <ProtectedRoute component={Account} />} />
      
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
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <CartProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </CartProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
