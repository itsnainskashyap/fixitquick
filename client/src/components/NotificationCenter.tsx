import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNotifications } from '@/hooks/useSocket';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import {
  Bell,
  BellRing,
  Package,
  Wrench,
  CreditCard,
  AlertCircle,
  CheckCircle,
  X,
  Settings,
  MarkAsUnread,
  Trash2
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface NotificationCenterProps {
  className?: string;
  compact?: boolean;
}

export function NotificationCenter({ className = '', compact = false }: NotificationCenterProps) {
  const {
    notifications,
    unreadCount,
    isConnected,
    markAsRead,
    markAllAsRead,
    clearNotifications,
  } = useNotifications();
  
  const [isOpen, setIsOpen] = useState(false);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'order':
        return <Package className="w-4 h-4 text-blue-500" />;
      case 'payment':
        return <CreditCard className="w-4 h-4 text-green-500" />;
      case 'promotion':
        return <BellRing className="w-4 h-4 text-purple-500" />;
      case 'system':
        return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      default:
        return <Bell className="w-4 h-4 text-gray-500" />;
    }
  };

  const getNotificationPriority = (notification: any) => {
    if (notification.type === 'system' && notification.title.includes('Error')) return 'high';
    if (notification.type === 'order' && notification.title.includes('Cancelled')) return 'high';
    if (notification.type === 'payment') return 'medium';
    return 'low';
  };

  const formatTime = (timestamp: string | Date) => {
    return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
  };

  const handleNotificationClick = (notification: any) => {
    if (!notification.isRead) {
      markAsRead(notification.id);
    }
    
    // Handle notification navigation based on type
    if (notification.type === 'order' && notification.data?.orderId) {
      window.location.href = `/orders/${notification.data.orderId}`;
    }
  };

  const NotificationItem = ({ notification, onClose }: { notification: any; onClose?: () => void }) => {
    const priority = getNotificationPriority(notification);
    
    return (
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        className={`p-3 border-l-4 cursor-pointer hover:bg-accent/50 transition-colors ${
          !notification.isRead ? 'bg-accent/20' : ''
        } ${
          priority === 'high' ? 'border-l-red-500' :
          priority === 'medium' ? 'border-l-yellow-500' :
          'border-l-gray-300'
        }`}
        onClick={() => handleNotificationClick(notification)}
        data-testid={`notification-${notification.id}`}
      >
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0 mt-0.5">
            {getNotificationIcon(notification.type)}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between">
              <h4 className={`text-sm font-medium ${!notification.isRead ? 'text-foreground' : 'text-muted-foreground'}`}>
                {notification.title}
              </h4>
              
              {onClose && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 hover:bg-accent"
                  onClick={(e) => {
                    e.stopPropagation();
                    onClose();
                  }}
                  data-testid={`notification-close-${notification.id}`}
                >
                  <X className="w-3 h-3" />
                </Button>
              )}
              
              {!notification.isRead && (
                <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 ml-2" />
              )}
            </div>
            
            <p className="text-xs text-muted-foreground mt-1">
              {notification.body}
            </p>
            
            <div className="flex items-center justify-between mt-2">
              <span className="text-xs text-muted-foreground">
                {formatTime(notification.createdAt)}
              </span>
              
              {notification.data?.orderId && (
                <Badge variant="outline" className="text-xs">
                  Order #{notification.data.orderId.slice(-8)}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    );
  };

  if (compact) {
    return (
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button 
            variant="ghost" 
            size="sm" 
            className={`relative ${className}`}
            data-testid="notification-trigger"
          >
            {unreadCount > 0 ? (
              <BellRing className="w-5 h-5" />
            ) : (
              <Bell className="w-5 h-5" />
            )}
            {unreadCount > 0 && (
              <Badge 
                className="absolute -top-1 -right-1 px-1 min-w-[18px] h-4 text-xs bg-red-500 border-0"
                data-testid="notification-badge"
              >
                {unreadCount > 99 ? '99+' : unreadCount}
              </Badge>
            )}
            {!isConnected && (
              <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-red-500 rounded-full" />
            )}
          </Button>
        </PopoverTrigger>
        
        <PopoverContent className="w-80 p-0" align="end" data-testid="notification-popover">
          <div className="p-4 border-b">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Notifications</h3>
              <div className="flex items-center space-x-2">
                {unreadCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={markAllAsRead}
                    data-testid="button-mark-all-read"
                  >
                    <CheckCircle className="w-4 h-4" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  data-testid="button-settings"
                >
                  <Settings className="w-4 h-4" />
                </Button>
              </div>
            </div>
            
            {!isConnected && (
              <div className="mt-2 text-xs text-red-500 flex items-center">
                <AlertCircle className="w-3 h-3 mr-1" />
                Connection lost - some notifications may be delayed
              </div>
            )}
          </div>

          <ScrollArea className="max-h-96">
            <div className="p-0">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No notifications yet</p>
                  <p className="text-xs mt-1">You'll see real-time updates here</p>
                </div>
              ) : (
                <AnimatePresence>
                  {notifications.map((notification, index) => (
                    <div key={notification.id}>
                      <NotificationItem 
                        notification={notification}
                        onClose={() => {
                          // Could implement individual notification dismissal here
                        }}
                      />
                      {index < notifications.length - 1 && <Separator />}
                    </div>
                  ))}
                </AnimatePresence>
              )}
            </div>
          </ScrollArea>

          {notifications.length > 0 && (
            <div className="p-3 border-t bg-accent/20">
              <div className="flex justify-between">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs"
                  onClick={() => {
                    // Navigate to notifications page
                    window.location.href = '/notifications';
                  }}
                  data-testid="button-view-all"
                >
                  View All
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs"
                  onClick={clearNotifications}
                  data-testid="button-clear-all"
                >
                  <Trash2 className="w-3 h-3 mr-1" />
                  Clear All
                </Button>
              </div>
            </div>
          )}
        </PopoverContent>
      </Popover>
    );
  }

  // Full notification center view
  return (
    <Card className={`w-full ${className}`}>
      <CardContent className="p-0">
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">Notifications</h2>
              <p className="text-sm text-muted-foreground mt-1">
                {unreadCount > 0 ? `${unreadCount} unread notifications` : 'All caught up!'}
              </p>
            </div>
            
            <div className="flex items-center space-x-2">
              {unreadCount > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={markAllAsRead}
                  data-testid="button-mark-all-read-full"
                >
                  Mark All Read
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                data-testid="button-settings-full"
              >
                <Settings className="w-4 h-4" />
              </Button>
            </div>
          </div>
          
          {!isConnected && (
            <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
              <div className="flex items-center text-red-700 dark:text-red-400">
                <AlertCircle className="w-4 h-4 mr-2" />
                <span className="text-sm">
                  Connection lost - some notifications may be delayed
                </span>
              </div>
            </div>
          )}
        </div>

        <ScrollArea className="max-h-[600px]">
          <div className="divide-y">
            {notifications.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground">
                <Bell className="w-16 h-16 mx-auto mb-4 opacity-30" />
                <h3 className="text-lg font-medium mb-2">No notifications yet</h3>
                <p className="text-sm">
                  When you receive orders, payments, or system updates, they'll appear here in real-time.
                </p>
              </div>
            ) : (
              <AnimatePresence>
                {notifications.map((notification) => (
                  <NotificationItem 
                    key={notification.id}
                    notification={notification}
                  />
                ))}
              </AnimatePresence>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

export default NotificationCenter;