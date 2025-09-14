import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useOrderTracking } from '@/hooks/useSocket';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  MapPin, 
  Clock, 
  CheckCircle, 
  Truck, 
  User, 
  Phone, 
  MessageCircle,
  Navigation,
  AlertCircle,
  Wifi,
  WifiOff,
  Calendar,
  Star
} from 'lucide-react';
import { format } from 'date-fns';

interface LiveOrderTrackingProps {
  orderId: string;
  order?: any; // Order object from API
  onStatusChange?: (status: string) => void;
  showMap?: boolean;
  compact?: boolean;
}

export function LiveOrderTracking({ 
  orderId, 
  order, 
  onStatusChange, 
  showMap = true,
  compact = false 
}: LiveOrderTrackingProps) {
  const {
    orderStatus,
    providerLocation,
    estimatedArrival,
    isConnected,
    updateOrderStatus,
    shareLocation,
  } = useOrderTracking(orderId);

  const [currentStatus, setCurrentStatus] = useState(order?.status || 'pending');

  useEffect(() => {
    if (orderStatus) {
      setCurrentStatus(orderStatus);
      onStatusChange?.(orderStatus);
    }
  }, [orderStatus, onStatusChange]);

  const getStatusSteps = () => [
    { 
      id: 'pending', 
      label: 'Order Placed', 
      description: 'Waiting for provider confirmation',
      icon: Clock 
    },
    { 
      id: 'accepted', 
      label: 'Confirmed', 
      description: 'Provider accepted your order',
      icon: CheckCircle 
    },
    { 
      id: 'in_progress', 
      label: 'In Progress', 
      description: 'Provider is on the way or working',
      icon: Truck 
    },
    { 
      id: 'completed', 
      label: 'Completed', 
      description: 'Service has been completed',
      icon: CheckCircle 
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'accepted': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      case 'in_progress': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400';
      case 'completed': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'cancelled': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  const getProgressPercentage = (status: string) => {
    const steps = getStatusSteps();
    const currentIndex = steps.findIndex(step => step.id === status);
    return currentIndex >= 0 ? ((currentIndex + 1) / steps.length) * 100 : 0;
  };

  const StatusTimeline = () => {
    const steps = getStatusSteps();
    const currentIndex = steps.findIndex(step => step.id === currentStatus);
    
    return (
      <div className="space-y-4">
        {steps.map((step, index) => {
          const isCompleted = index <= currentIndex;
          const isCurrent = index === currentIndex;
          const Icon = step.icon;
          
          return (
            <motion.div
              key={step.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="flex items-center space-x-4"
              data-testid={`status-step-${step.id}`}
            >
              <div className={`relative flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                isCompleted 
                  ? 'bg-primary border-primary text-primary-foreground' 
                  : 'bg-background border-muted-foreground/30'
              }`}>
                <Icon className="w-5 h-5" />
                {isCurrent && isConnected && (
                  <motion.div
                    className="absolute inset-0 rounded-full border-2 border-primary"
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                )}
              </div>
              
              <div className="flex-1">
                <h4 className={`font-medium ${isCurrent ? 'text-foreground' : 'text-muted-foreground'}`}>
                  {step.label}
                </h4>
                <p className="text-sm text-muted-foreground">
                  {step.description}
                </p>
                {isCurrent && (
                  <Badge className={`mt-1 ${getStatusColor(currentStatus)}`}>
                    Current Status
                  </Badge>
                )}
              </div>
              
              {index < steps.length - 1 && (
                <div className={`absolute left-5 mt-10 w-0.5 h-8 ${
                  isCompleted ? 'bg-primary' : 'bg-muted-foreground/30'
                }`} style={{ top: `${(index + 1) * 80 + 40}px` }} />
              )}
            </motion.div>
          );
        })}
      </div>
    );
  };

  const ProviderInfo = () => {
    if (!order?.serviceProviderId && !order?.partsProviderId) return null;

    return (
      <Card className="mt-4">
        <CardContent className="p-4">
          <div className="flex items-center space-x-3">
            <Avatar>
              <AvatarImage src={order.providerImage} />
              <AvatarFallback>
                {order.providerName?.[0] || 'P'}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1">
              <h4 className="font-medium" data-testid="provider-name">
                {order.providerName || 'Service Provider'}
              </h4>
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <Star className="w-3 h-3 fill-current text-yellow-500" />
                <span>{order.providerRating || '4.8'}</span>
                <span>•</span>
                <span>{order.providerServices || '120+ services'}</span>
              </div>
            </div>
            
            <div className="flex space-x-2">
              <Button size="sm" variant="outline" data-testid="button-call-provider">
                <Phone className="w-4 h-4" />
              </Button>
              <Button size="sm" variant="outline" data-testid="button-message-provider">
                <MessageCircle className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const LocationTracking = () => {
    if (!providerLocation || !showMap) return null;

    return (
      <Card className="mt-4">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center space-x-2 text-base">
            <MapPin className="w-4 h-4" />
            <span>Live Location</span>
            {isConnected ? (
              <Badge variant="outline" className="text-green-600 border-green-600">
                <Wifi className="w-3 h-3 mr-1" />
                Live
              </Badge>
            ) : (
              <Badge variant="outline" className="text-red-600 border-red-600">
                <WifiOff className="w-3 h-3 mr-1" />
                Offline
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-muted/50 rounded-lg p-4 text-center">
            <MapPin className="w-8 h-8 mx-auto mb-2 text-primary" />
            <p className="text-sm font-medium">Provider Location</p>
            <p className="text-xs text-muted-foreground mt-1">
              Last updated: {format(new Date(providerLocation.timestamp), 'HH:mm:ss')}
            </p>
            <p className="text-xs text-muted-foreground">
              Accuracy: ±{providerLocation.accuracy}m
            </p>
          </div>
          
          {estimatedArrival && (
            <div className="mt-4 flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium">Estimated Arrival</span>
              </div>
              <span className="text-sm font-semibold text-blue-600">
                {format(estimatedArrival, 'HH:mm')}
              </span>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  const ConnectionStatus = () => (
    <div className={`flex items-center space-x-2 text-xs ${
      isConnected ? 'text-green-600' : 'text-red-600'
    }`}>
      {isConnected ? (
        <>
          <Wifi className="w-3 h-3" />
          <span>Live updates active</span>
        </>
      ) : (
        <>
          <WifiOff className="w-3 h-3" />
          <span>Connection lost - updates may be delayed</span>
        </>
      )}
    </div>
  );

  if (compact) {
    return (
      <Card className="w-full">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <Badge className={getStatusColor(currentStatus)} data-testid="order-status-badge">
              {currentStatus.replace('_', ' ').toUpperCase()}
            </Badge>
            <ConnectionStatus />
          </div>
          
          <Progress 
            value={getProgressPercentage(currentStatus)} 
            className="mb-3"
            data-testid="order-progress"
          />
          
          <div className="text-sm text-muted-foreground">
            Order #{orderId.slice(-8)} • {format(new Date(order?.createdAt || Date.now()), 'MMM dd, HH:mm')}
          </div>
          
          {providerLocation && (
            <div className="mt-2 text-xs text-muted-foreground flex items-center">
              <Navigation className="w-3 h-3 mr-1" />
              Provider location updated {format(new Date(providerLocation.timestamp), 'HH:mm')}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <Truck className="w-5 h-5" />
            <span>Live Order Tracking</span>
          </CardTitle>
          <ConnectionStatus />
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Order Progress</span>
              <Badge className={getStatusColor(currentStatus)} data-testid="order-status-badge-full">
                {currentStatus.replace('_', ' ').toUpperCase()}
              </Badge>
            </div>
            <Progress 
              value={getProgressPercentage(currentStatus)} 
              className="mb-2"
              data-testid="order-progress-full"
            />
            <div className="text-xs text-muted-foreground">
              Order #{orderId.slice(-8)} • Created {format(new Date(order?.createdAt || Date.now()), 'MMM dd, yyyy • HH:mm')}
            </div>
          </div>

          <StatusTimeline />
        </CardContent>
      </Card>

      <ProviderInfo />
      <LocationTracking />
    </div>
  );
}

export default LiveOrderTracking;