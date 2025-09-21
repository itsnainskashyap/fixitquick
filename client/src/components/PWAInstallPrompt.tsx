import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { X, Download, Share, Plus, Smartphone } from 'lucide-react';

interface PWAInstallPromptProps {
  onInstall?: () => void;
  onDismiss?: () => void;
}

export function PWAInstallPrompt({ onInstall, onDismiss }: PWAInstallPromptProps) {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Detect iOS devices
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
                        (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const isInStandaloneMode = window.matchMedia('(display-mode: standalone)').matches ||
                               (window.navigator as any).standalone === true;
    
    setIsIOS(isIOSDevice);
    setIsStandalone(isInStandaloneMode);
    setIsInstalled(isInStandaloneMode);
    
    // For non-iOS devices, check standard PWA installation states
    if (!isIOSDevice) {
      const isFullscreen = window.matchMedia('(display-mode: fullscreen)').matches;
      const isMinimalUI = window.matchMedia('(display-mode: minimal-ui)').matches;
      setIsInstalled(isInStandaloneMode || isFullscreen || isMinimalUI);
    }

    // Listen for the beforeinstallprompt event (not available on iOS)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      
      // Show prompt after 3 seconds if not dismissed before
      const isDismissed = localStorage.getItem('pwa-install-dismissed');
      if (!isDismissed && !isInstalled) {
        setTimeout(() => {
          setShowPrompt(true);
        }, 3000);
      }
    };
    
    // For iOS devices, show manual install prompt after delay
    if (isIOSDevice && !isInStandaloneMode) {
      const isDismissed = localStorage.getItem('pwa-install-dismissed-ios');
      if (!isDismissed) {
        setTimeout(() => {
          setShowPrompt(true);
        }, 5000); // Longer delay for iOS manual instructions
      }
    }

    // Listen for successful installation
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowPrompt(false);
      setDeferredPrompt(null);
      onInstall?.();
    };

    // Only add beforeinstallprompt listener for non-iOS devices
    if (!isIOSDevice) {
      window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.addEventListener('appinstalled', handleAppInstalled);
    }

    return () => {
      if (!isIOSDevice) {
        window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        window.removeEventListener('appinstalled', handleAppInstalled);
      }
    };
  }, [isInstalled, onInstall]);

  const handleInstallClick = async () => {
    if (isIOS) {
      // For iOS, we can't trigger install programmatically, just show instructions
      return;
    }
    
    if (!deferredPrompt) return;

    try {
      deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      
      if (choiceResult.outcome === 'accepted') {
        console.log('User accepted the install prompt');
      } else {
        console.log('User dismissed the install prompt');
      }
      
      setDeferredPrompt(null);
      setShowPrompt(false);
    } catch (error) {
      console.error('Error during app installation:', error);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    // Use different storage keys for iOS vs non-iOS
    const storageKey = isIOS ? 'pwa-install-dismissed-ios' : 'pwa-install-dismissed';
    localStorage.setItem(storageKey, 'true');
    onDismiss?.();
  };

  if (isInstalled || !showPrompt) {
    return null;
  }

  return (
    <AnimatePresence>
      {showPrompt && (
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="fixed top-0 left-0 right-0 z-50 bg-primary text-primary-foreground shadow-lg"
          data-testid="pwa-install-prompt"
        >
          <div className="max-w-md mx-auto p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3 flex-1">
                <motion.div
                  animate={{ 
                    scale: [1, 1.1, 1],
                    rotate: [0, 5, -5, 0]
                  }}
                  transition={{ 
                    duration: 2,
                    repeat: Infinity,
                    repeatType: 'reverse'
                  }}
                  className="w-10 h-10 bg-primary-foreground rounded-lg flex items-center justify-center"
                >
                  <span className="text-primary font-bold text-lg">FQ</span>
                </motion.div>
                <div className="flex-1">
                  <h3 className="font-semibold text-sm">
                    {isIOS ? 'Add FixitQuick to Home Screen' : 'Install FixitQuick'}
                  </h3>
                  <p className="text-xs opacity-90">
                    {isIOS 
                      ? 'Get the full app experience on your device' 
                      : 'For offline bookings & faster access'
                    }
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                {isIOS ? (
                  <div className="flex items-center space-x-2 text-xs">
                    <div className="flex items-center space-x-1 bg-primary-foreground/20 px-2 py-1 rounded">
                      <Share className="w-3 h-3" />
                      <span>Share</span>
                    </div>
                    <span>→</span>
                    <div className="flex items-center space-x-1 bg-primary-foreground/20 px-2 py-1 rounded">
                      <Plus className="w-3 h-3" />
                      <span>Add to Home Screen</span>
                    </div>
                  </div>
                ) : (
                  <Button
                    onClick={handleInstallClick}
                    size="sm"
                    variant="secondary"
                    className="bg-primary-foreground text-primary hover:bg-primary-foreground/90 transition-colors"
                    data-testid="install-button"
                  >
                    <Download className="w-4 h-4 mr-1" />
                    Install
                  </Button>
                )}
                
                <Button
                  onClick={handleDismiss}
                  size="sm"
                  variant="ghost"
                  className="text-primary-foreground hover:bg-primary-foreground/20 p-2"
                  data-testid="dismiss-button"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Detailed iOS Instructions */}
            {isIOS && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                transition={{ delay: 0.3, duration: 0.5 }}
                className="mt-3 pt-3 border-t border-primary-foreground/20"
              >
                <div className="flex items-start space-x-2 text-xs">
                  <Smartphone className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <div className="space-y-1">
                    <p className="font-medium">iOS Installation Steps:</p>
                    <ol className="space-y-1 list-decimal list-inside opacity-90">
                      <li>Tap the Share button <Share className="w-3 h-3 inline" /> in Safari</li>
                      <li>Scroll down and tap "Add to Home Screen" <Plus className="w-3 h-3 inline" /></li>
                      <li>Tap "Add" to confirm</li>
                    </ol>
                  </div>
                </div>
              </motion.div>
            )}
          </div>

          {/* Confetti effect on successful installation */}
          <motion.div
            className="absolute inset-0 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: isInstalled ? 1 : 0 }}
            transition={{ duration: 0.5 }}
          >
            {[...Array(20)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-2 h-2 bg-yellow-400 rounded-full"
                initial={{
                  x: Math.random() * window.innerWidth,
                  y: -10,
                  rotate: 0,
                }}
                animate={{
                  y: window.innerHeight + 10,
                  rotate: 360,
                }}
                transition={{
                  duration: 3,
                  delay: i * 0.1,
                  ease: 'easeOut',
                }}
              />
            ))}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Hook for programmatic PWA installation
export function usePWAInstall() {
  const [canInstall, setCanInstall] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Detect iOS devices
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
                        (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    setIsIOS(isIOSDevice);

    const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                         (window.navigator as any).standalone === true;
    setIsInstalled(isStandalone);

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setCanInstall(true);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setCanInstall(false);
      setDeferredPrompt(null);
    };

    // Only add listeners for non-iOS devices
    if (!isIOSDevice) {
      window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.addEventListener('appinstalled', handleAppInstalled);
    } else {
      // For iOS, we can install but need manual process
      setCanInstall(!isStandalone);
    }

    return () => {
      if (!isIOSDevice) {
        window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        window.removeEventListener('appinstalled', handleAppInstalled);
      }
    };
  }, []);

  const install = async () => {
    if (isIOS) {
      // For iOS, we can't programmatically install, return false to indicate manual process needed
      return false;
    }

    if (!deferredPrompt) return false;

    try {
      deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      
      setDeferredPrompt(null);
      setCanInstall(false);
      
      return choiceResult.outcome === 'accepted';
    } catch (error) {
      console.error('Error installing PWA:', error);
      return false;
    }
  };

  return {
    canInstall,
    isInstalled,
    isIOS,
    install,
  };
}