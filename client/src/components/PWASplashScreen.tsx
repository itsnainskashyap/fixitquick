import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wrench, Hammer, Settings } from 'lucide-react';

interface PWASplashScreenProps {
  isVisible: boolean;
  onComplete?: () => void;
  duration?: number;
}

export function PWASplashScreen({ 
  isVisible, 
  onComplete, 
  duration = 2500 
}: PWASplashScreenProps) {
  const [currentPhase, setCurrentPhase] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!isVisible) return;

    const phases = [
      { delay: 0, progress: 25 },
      { delay: 600, progress: 50 },
      { delay: 1200, progress: 75 },
      { delay: 1800, progress: 100 }
    ];

    phases.forEach((phase, index) => {
      setTimeout(() => {
        setCurrentPhase(index);
        setProgress(phase.progress);
      }, phase.delay);
    });

    // Complete the splash screen
    const timer = setTimeout(() => {
      onComplete?.();
    }, duration);

    return () => clearTimeout(timer);
  }, [isVisible, duration, onComplete]);

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.3 }}
        className="fixed inset-0 z-50 bg-gradient-to-br from-primary via-primary/95 to-violet-600 flex flex-col items-center justify-center text-white"
        data-testid="pwa-splash-screen"
      >
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent bg-repeat" />
        </div>

        {/* Main Logo and Animation */}
        <div className="relative z-10 flex flex-col items-center">
          {/* Logo Container */}
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ 
              type: 'spring',
              stiffness: 200,
              damping: 15,
              delay: 0.2
            }}
            className="relative mb-8"
          >
            {/* Main Logo Background */}
            <div className="w-24 h-24 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm border border-white/30">
              {/* Animated Tools */}
              <div className="relative">
                <motion.div
                  animate={{ 
                    rotate: currentPhase >= 1 ? 15 : 0,
                    x: currentPhase >= 1 ? -2 : 0
                  }}
                  transition={{ duration: 0.5, ease: 'easeInOut' }}
                  className="absolute"
                >
                  <Wrench className="w-8 h-8 text-white" />
                </motion.div>
                
                <motion.div
                  animate={{ 
                    rotate: currentPhase >= 2 ? -15 : 0,
                    x: currentPhase >= 2 ? 2 : 0
                  }}
                  transition={{ duration: 0.5, ease: 'easeInOut', delay: 0.1 }}
                  className="absolute"
                >
                  <Hammer className="w-8 h-8 text-white opacity-80" />
                </motion.div>

                {/* Rotating Settings Icon */}
                <motion.div
                  animate={{ 
                    rotate: 360,
                    scale: [1, 1.1, 1]
                  }}
                  transition={{ 
                    rotate: { duration: 3, repeat: Infinity, ease: 'linear' },
                    scale: { duration: 2, repeat: Infinity, ease: 'easeInOut' }
                  }}
                  className="absolute -top-1 -right-1"
                >
                  <Settings className="w-4 h-4 text-white/60" />
                </motion.div>
              </div>
            </div>

            {/* Glowing Ring Effect */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ 
                scale: [0.8, 1.2, 0.8],
                opacity: [0.3, 0.6, 0.3]
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: 'easeInOut'
              }}
              className="absolute inset-0 border-2 border-white/40 rounded-2xl"
            />
          </motion.div>

          {/* App Name */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.5 }}
            className="text-center mb-8"
          >
            <h1 className="text-3xl font-bold mb-2">FixitQuick</h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1, duration: 0.5 }}
              className="text-white/80 text-lg"
            >
              Your Urban Service Partner
            </motion.p>
          </motion.div>

          {/* Loading Animation */}
          <div className="w-64 mb-6">
            {/* Progress Bar */}
            <div className="relative h-1 bg-white/20 rounded-full overflow-hidden">
              <motion.div
                className="absolute left-0 top-0 h-full bg-gradient-to-r from-white to-yellow-200 rounded-full"
                initial={{ width: '0%' }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
              />
              
              {/* Glowing Effect */}
              <motion.div
                className="absolute left-0 top-0 h-full w-8 bg-white/40 rounded-full blur-sm"
                animate={{ x: `${progress * 2.4}px` }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
              />
            </div>

            {/* Loading Text */}
            <motion.div
              key={currentPhase}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="text-center mt-4 text-white/70 text-sm"
            >
              {currentPhase === 0 && 'Initializing app...'}
              {currentPhase === 1 && 'Loading services...'}
              {currentPhase === 2 && 'Connecting providers...'}
              {currentPhase === 3 && 'Almost ready!'}
            </motion.div>
          </div>

          {/* Feature Highlights */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.2, duration: 0.5 }}
            className="flex space-x-6 text-xs text-white/60"
          >
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              <span>Offline Support</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
              <span>Fast Access</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
              <span>Push Notifications</span>
            </div>
          </motion.div>
        </div>

        {/* Floating Elements */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {[...Array(8)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-4 h-4 bg-white/10 rounded-full"
              initial={{
                x: Math.random() * window.innerWidth,
                y: window.innerHeight + 20,
                scale: 0
              }}
              animate={{
                y: -20,
                scale: [0, 1, 0],
                rotate: 360
              }}
              transition={{
                duration: 4 + Math.random() * 2,
                delay: Math.random() * 2,
                repeat: Infinity,
                ease: 'linear'
              }}
            />
          ))}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

// Hook to manage splash screen display
export function usePWASplashScreen() {
  const [isVisible, setIsVisible] = useState(false);

  const showSplashScreen = () => {
    setIsVisible(true);
  };

  const hideSplashScreen = () => {
    setIsVisible(false);
  };

  return {
    isVisible,
    showSplashScreen,
    hideSplashScreen,
  };
}