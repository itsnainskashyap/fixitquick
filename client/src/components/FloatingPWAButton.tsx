import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Download, X, Wrench, Smartphone, Monitor } from 'lucide-react';
import { usePWAInstall } from './PWAInstallPrompt';

interface FloatingPWAButtonProps {
  className?: string;
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  autoShow?: boolean;
  showDelay?: number;
}

export function FloatingPWAButton({ 
  className = '',
  position = 'bottom-right',
  autoShow = true,
  showDelay = 5000
}: FloatingPWAButtonProps) {
  const { canInstall, isInstalled, install } = usePWAInstall();
  const [isVisible, setIsVisible] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isPulseActive, setIsPulseActive] = useState(true);
  const [deviceType, setDeviceType] = useState<'mobile' | 'desktop'>('desktop');

  useEffect(() => {
    // Detect device type
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    setDeviceType(isMobile ? 'mobile' : 'desktop');

    // Check if we should show the button
    if (canInstall && !isInstalled && autoShow) {
      const timer = setTimeout(() => {
        setIsVisible(true);
        // Start pulsing animation
        setTimeout(() => setIsPulseActive(false), 3000);
      }, showDelay);

      return () => clearTimeout(timer);
    }
  }, [canInstall, isInstalled, autoShow, showDelay]);

  const handleInstall = async () => {
    const success = await install();
    if (success) {
      setIsVisible(false);
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem('floating-pwa-dismissed', 'true');
  };

  const getPositionClasses = () => {
    const baseClasses = 'fixed z-40';
    switch (position) {
      case 'bottom-right':
        return `${baseClasses} bottom-6 right-6`;
      case 'bottom-left':
        return `${baseClasses} bottom-6 left-6`;
      case 'top-right':
        return `${baseClasses} top-6 right-6`;
      case 'top-left':
        return `${baseClasses} top-6 left-6`;
      default:
        return `${baseClasses} bottom-6 right-6`;
    }
  };

  // Don't show if already installed or can't install
  if (isInstalled || !canInstall || !isVisible) {
    return null;
  }

  return (
    <AnimatePresence>
      {isVisible && (
        <div className={`${getPositionClasses()} ${className}`}>
          {/* Expanded Information Card */}
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.95 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className="absolute bottom-16 right-0 mb-2 w-72 bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 p-4"
                data-testid="pwa-info-card"
              >
                {/* Close Button */}
                <button
                  onClick={() => setIsExpanded(false)}
                  className="absolute top-2 right-2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                  data-testid="info-close-button"
                >
                  <X className="w-4 h-4" />
                </button>

                {/* Header */}
                <div className="flex items-start space-x-3 mb-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-primary to-violet-600 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Wrench className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground text-sm">Install FixitQuick</h3>
                    <p className="text-xs text-muted-foreground">Get the app for faster access</p>
                  </div>
                </div>

                {/* Benefits */}
                <div className="space-y-2 mb-4">
                  <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                    <div className="w-2 h-2 bg-green-500 rounded-full" />
                    <span>Works offline</span>
                  </div>
                  <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                    <div className="w-2 h-2 bg-blue-500 rounded-full" />
                    <span>Push notifications</span>
                  </div>
                  <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                    <div className="w-2 h-2 bg-purple-500 rounded-full" />
                    <span>Instant access from home screen</span>
                  </div>
                </div>

                {/* Device-specific message */}
                <div className="flex items-center space-x-2 mb-4 p-2 bg-primary/5 rounded-lg">
                  {deviceType === 'mobile' ? (
                    <Smartphone className="w-4 h-4 text-primary" />
                  ) : (
                    <Monitor className="w-4 h-4 text-primary" />
                  )}
                  <span className="text-xs text-primary">
                    {deviceType === 'mobile' 
                      ? 'Add to your home screen' 
                      : 'Install as desktop app'
                    }
                  </span>
                </div>

                {/* Install Button */}
                <Button
                  onClick={handleInstall}
                  className="w-full bg-gradient-to-r from-primary to-violet-600 hover:from-primary/90 hover:to-violet-600/90 text-white"
                  size="sm"
                  data-testid="expanded-install-button"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Install Now
                </Button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Main Floating Button */}
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ 
              scale: 1, 
              rotate: 0,
              y: isPulseActive ? [0, -8, 0] : 0
            }}
            exit={{ scale: 0, rotate: 180 }}
            transition={{ 
              type: 'spring',
              stiffness: 200,
              damping: 15,
              y: {
                duration: 1.5,
                repeat: isPulseActive ? Infinity : 0,
                ease: 'easeInOut'
              }
            }}
            className="relative"
          >
            {/* Pulse Ring */}
            <motion.div
              animate={{
                scale: isPulseActive ? [1, 1.5, 1] : 1,
                opacity: isPulseActive ? [0.5, 0, 0.5] : 0
              }}
              transition={{
                duration: 2,
                repeat: isPulseActive ? Infinity : 0,
                ease: 'easeInOut'
              }}
              className="absolute inset-0 bg-primary rounded-full"
            />

            {/* Main Button */}
            <motion.button
              onClick={() => setIsExpanded(!isExpanded)}
              onHoverStart={() => setIsPulseActive(false)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="relative w-14 h-14 bg-gradient-to-br from-primary to-violet-600 text-white rounded-full shadow-2xl flex items-center justify-center hover:shadow-primary/25 transition-all duration-200 border-2 border-white/20"
              data-testid="floating-pwa-button"
            >
              <div className="relative">
                <Wrench className="w-6 h-6" />
                
                {/* Download Badge */}
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 text-white rounded-full flex items-center justify-center">
                  <Download className="w-2.5 h-2.5" />
                </div>
              </div>
            </motion.button>

            {/* Dismiss Button */}
            <motion.button
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 3 }}
              onClick={handleDismiss}
              className="absolute -top-2 -right-2 w-6 h-6 bg-gray-600 text-white rounded-full flex items-center justify-center hover:bg-gray-700 transition-colors"
              data-testid="dismiss-floating-button"
            >
              <X className="w-3 h-3" />
            </motion.button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

// Simplified version for integration with existing components
export function PWAInstallFloatingButton() {
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem('floating-pwa-dismissed');
    setIsDismissed(dismissed === 'true');
  }, []);

  if (isDismissed) return null;

  return (
    <FloatingPWAButton 
      autoShow={true}
      showDelay={3000}
      position="bottom-right"
    />
  );
}