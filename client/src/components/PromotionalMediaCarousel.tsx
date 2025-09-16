import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Play, Pause, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import AutoPlayVideo, { AutoPlayVideoRef } from '@/components/AutoPlayVideo';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface PromotionalMedia {
  id: string;
  title: string;
  description?: string;
  mediaType: 'image' | 'video';
  mediaUrl: string;
  thumbnailUrl?: string;
  targetUrl?: string;
  autoPlay: boolean;
  loopEnabled: boolean;
  displayOrder: number;
  displaySettings?: {
    duration?: number;
    transition?: string;
    showTitle?: boolean;
    showDescription?: boolean;
  };
}

interface PromotionalMediaCarouselProps {
  placement?: string;
  userId?: string;
  className?: string;
  showNavigation?: boolean;
  showIndicators?: boolean;
  autoAdvance?: boolean;
  autoAdvanceDelay?: number;
  onMediaClick?: (media: PromotionalMedia) => void;
  onMediaView?: (mediaId: string) => void;
  maxItems?: number;
  'data-testid'?: string;
}

export default function PromotionalMediaCarousel({
  placement = 'header',
  userId,
  className,
  showNavigation = true,
  showIndicators = true,
  autoAdvance = true,
  autoAdvanceDelay = 5000,
  onMediaClick,
  onMediaView,
  maxItems = 5,
  'data-testid': testId,
}: PromotionalMediaCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const autoAdvanceRef = useRef<NodeJS.Timeout | null>(null);
  const videoRefs = useRef<{ [key: string]: AutoPlayVideoRef }>({});
  const impressionTrackedRef = useRef<Set<string>>(new Set());

  // Fetch active promotional media
  const {
    data: mediaData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['promotional-media', 'active', placement, userId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (placement) params.append('placement', placement);
      if (maxItems) params.append('limit', maxItems.toString());

      const response = await fetch(`/api/v1/promotional-media/active?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch promotional media');
      }
      const result = await response.json();
      return result.media as PromotionalMedia[];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });

  const media = mediaData || [];

  // Track media impressions
  const trackImpression = useCallback(async (mediaId: string) => {
    if (impressionTrackedRef.current.has(mediaId)) return;
    
    impressionTrackedRef.current.add(mediaId);
    onMediaView?.(mediaId);

    try {
      await fetch('/api/v1/promotional-media/track-impression', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mediaId,
          placement,
          sessionId: `session-${Date.now()}`,
          viewportSize: {
            width: window.innerWidth,
            height: window.innerHeight,
          },
          metadata: {
            userAgent: navigator.userAgent,
            timestamp: new Date().toISOString(),
          },
        }),
      });
    } catch (error) {
      console.error('Failed to track impression:', error);
    }
  }, [placement, onMediaView]);

  // Track media clicks
  const trackClick = useCallback(async (mediaId: string, targetUrl?: string) => {
    try {
      await fetch('/api/v1/promotional-media/track-click', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mediaId,
          placement,
          sessionId: `session-${Date.now()}`,
          metadata: {
            targetUrl,
            userAgent: navigator.userAgent,
            timestamp: new Date().toISOString(),
          },
        }),
      });
    } catch (error) {
      console.error('Failed to track click:', error);
    }
  }, [placement]);

  // Handle media click
  const handleMediaClick = useCallback((mediaItem: PromotionalMedia) => {
    setHasInteracted(true);
    
    // Track click
    trackClick(mediaItem.id, mediaItem.targetUrl);
    
    // Execute callback
    onMediaClick?.(mediaItem);
    
    // Open target URL if provided
    if (mediaItem.targetUrl) {
      window.open(mediaItem.targetUrl, '_blank', 'noopener,noreferrer');
    }
  }, [trackClick, onMediaClick]);

  // Auto-advance functionality
  useEffect(() => {
    if (!autoAdvance || media.length <= 1 || isHovered || hasInteracted) {
      if (autoAdvanceRef.current) {
        clearTimeout(autoAdvanceRef.current);
        autoAdvanceRef.current = null;
      }
      return;
    }

    autoAdvanceRef.current = setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % media.length);
    }, autoAdvanceDelay);

    return () => {
      if (autoAdvanceRef.current) {
        clearTimeout(autoAdvanceRef.current);
        autoAdvanceRef.current = null;
      }
    };
  }, [currentIndex, media.length, autoAdvance, autoAdvanceDelay, isHovered, hasInteracted]);

  // Track impressions for visible media
  useEffect(() => {
    if (media.length > 0 && currentIndex < media.length) {
      const currentMedia = media[currentIndex];
      if (currentMedia) {
        // Delay impression tracking slightly to ensure media is actually displayed
        const timer = setTimeout(() => {
          trackImpression(currentMedia.id);
        }, 500);
        return () => clearTimeout(timer);
      }
    }
  }, [currentIndex, media, trackImpression]);

  // Navigation functions
  const goToPrevious = useCallback(() => {
    setHasInteracted(true);
    setCurrentIndex((prev) => (prev - 1 + media.length) % media.length);
  }, [media.length]);

  const goToNext = useCallback(() => {
    setHasInteracted(true);
    setCurrentIndex((prev) => (prev + 1) % media.length);
  }, [media.length]);

  const goToIndex = useCallback((index: number) => {
    setHasInteracted(true);
    setCurrentIndex(index);
  }, []);

  // Handle video ref registration
  const registerVideoRef = useCallback((mediaId: string, ref: AutoPlayVideoRef | null) => {
    if (ref) {
      videoRefs.current[mediaId] = ref;
    } else {
      delete videoRefs.current[mediaId];
    }
  }, []);

  // Don't render if no media or loading
  if (isLoading || error || !media.length) {
    return null;
  }

  const currentMedia = media[currentIndex];
  if (!currentMedia) return null;

  return (
    <Card
      className={cn(
        'relative overflow-hidden bg-background border-border/50 shadow-lg',
        'min-h-[200px] max-h-[300px]',
        className
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      data-testid={testId}
    >
      {/* Main media display */}
      <div className="relative w-full h-full">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentMedia.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="absolute inset-0 w-full h-full"
          >
            {currentMedia.mediaType === 'video' ? (
              <div 
                className="relative w-full h-full cursor-pointer group"
                onClick={() => handleMediaClick(currentMedia)}
                data-testid={`video-media-${currentMedia.id}`}
              >
                <AutoPlayVideo
                  ref={(ref) => registerVideoRef(currentMedia.id, ref)}
                  src={currentMedia.mediaUrl}
                  poster={currentMedia.thumbnailUrl}
                  className="w-full h-full object-cover"
                  muted={true}
                  loop={currentMedia.loopEnabled}
                  preload="auto"
                  data-testid={`auto-play-video-${currentMedia.id}`}
                />
                
                {/* Video overlay for click indication */}
                {currentMedia.targetUrl && (
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-200 flex items-center justify-center">
                    <motion.div
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: isHovered ? 1 : 0, opacity: isHovered ? 1 : 0 }}
                      transition={{ duration: 0.2 }}
                      className="bg-white/90 rounded-full p-3 shadow-lg"
                    >
                      <ExternalLink className="w-6 h-6 text-gray-700" />
                    </motion.div>
                  </div>
                )}
              </div>
            ) : (
              <div 
                className="relative w-full h-full cursor-pointer group"
                onClick={() => handleMediaClick(currentMedia)}
                data-testid={`image-media-${currentMedia.id}`}
              >
                <img
                  src={currentMedia.mediaUrl}
                  alt={currentMedia.title}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
                
                {/* Image overlay for click indication */}
                {currentMedia.targetUrl && (
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-200 flex items-center justify-center">
                    <motion.div
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: isHovered ? 1 : 0, opacity: isHovered ? 1 : 0 }}
                      transition={{ duration: 0.2 }}
                      className="bg-white/90 rounded-full p-3 shadow-lg"
                    >
                      <ExternalLink className="w-6 h-6 text-gray-700" />
                    </motion.div>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Media information overlay */}
        {(currentMedia.displaySettings?.showTitle || currentMedia.displaySettings?.showDescription) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: isHovered ? 1 : 0, y: isHovered ? 0 : 20 }}
            transition={{ duration: 0.3 }}
            className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4"
          >
            {currentMedia.displaySettings?.showTitle && (
              <h3 className="text-white font-semibold text-lg mb-1 line-clamp-2">
                {currentMedia.title}
              </h3>
            )}
            {currentMedia.displaySettings?.showDescription && currentMedia.description && (
              <p className="text-white/90 text-sm line-clamp-2">
                {currentMedia.description}
              </p>
            )}
          </motion.div>
        )}

        {/* Navigation arrows */}
        {showNavigation && media.length > 1 && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: isHovered ? 1 : 0 }}
              transition={{ duration: 0.2 }}
              className="absolute left-2 top-1/2 -translate-y-1/2"
            >
              <Button
                variant="secondary"
                size="icon"
                className="h-8 w-8 bg-white/90 hover:bg-white shadow-lg"
                onClick={goToPrevious}
                data-testid="carousel-previous"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: isHovered ? 1 : 0 }}
              transition={{ duration: 0.2 }}
              className="absolute right-2 top-1/2 -translate-y-1/2"
            >
              <Button
                variant="secondary"
                size="icon"
                className="h-8 w-8 bg-white/90 hover:bg-white shadow-lg"
                onClick={goToNext}
                data-testid="carousel-next"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </motion.div>
          </>
        )}

        {/* Indicators */}
        {showIndicators && media.length > 1 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: isHovered ? 1 : 0.7 }}
            transition={{ duration: 0.2 }}
            className="absolute bottom-4 left-1/2 -translate-x-1/2 flex space-x-2"
          >
            {media.map((_, index) => (
              <button
                key={index}
                onClick={() => goToIndex(index)}
                className={cn(
                  'w-2 h-2 rounded-full transition-colors duration-200',
                  index === currentIndex
                    ? 'bg-white'
                    : 'bg-white/50 hover:bg-white/75'
                )}
                data-testid={`carousel-indicator-${index}`}
              />
            ))}
          </motion.div>
        )}

        {/* Auto-advance progress indicator */}
        {autoAdvance && !hasInteracted && !isHovered && media.length > 1 && (
          <div className="absolute top-0 left-0 right-0 h-1 bg-white/20">
            <motion.div
              key={currentIndex}
              initial={{ width: '0%' }}
              animate={{ width: '100%' }}
              transition={{ duration: autoAdvanceDelay / 1000, ease: 'linear' }}
              className="h-full bg-white/60"
            />
          </div>
        )}
      </div>
    </Card>
  );
}