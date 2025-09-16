import { useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { cn } from '@/lib/utils';

interface AutoPlayVideoProps {
  src: string;
  poster?: string;
  className?: string;
  onLoadStart?: () => void;
  onLoadError?: (error: string) => void;
  onEnded?: () => void;
  muted?: boolean;
  loop?: boolean;
  preload?: 'auto' | 'metadata' | 'none';
  priority?: boolean;
  'data-testid'?: string;
}

export interface AutoPlayVideoRef {
  play: () => Promise<void>;
  pause: () => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  isPlaying: () => boolean;
  restart: () => void;
}

const AutoPlayVideo = forwardRef<AutoPlayVideoRef, AutoPlayVideoProps>(
  ({
    src,
    poster,
    className,
    onLoadStart,
    onLoadError,
    onEnded,
    muted = true,
    loop = true,
    preload = 'auto',
    priority = false,
    'data-testid': testId,
  }, ref) => {
    const videoRef = useRef<HTMLVideoElement>(null);

    // Expose video controls via ref
    useImperativeHandle(ref, () => ({
      play: async () => {
        if (videoRef.current) {
          try {
            await videoRef.current.play();
          } catch (error) {
            console.error('Failed to play video:', error);
          }
        }
      },
      pause: () => {
        if (videoRef.current) {
          videoRef.current.pause();
        }
      },
      getCurrentTime: () => {
        return videoRef.current?.currentTime || 0;
      },
      getDuration: () => {
        return videoRef.current?.duration || 0;
      },
      isPlaying: () => {
        return videoRef.current ? !videoRef.current.paused : false;
      },
      restart: () => {
        if (videoRef.current) {
          videoRef.current.currentTime = 0;
          videoRef.current.play().catch(console.error);
        }
      },
    }));

    useEffect(() => {
      const video = videoRef.current;
      if (!video) return;

      const handleLoadStart = () => {
        onLoadStart?.();
      };

      const handleError = () => {
        const error = video.error;
        const errorMessage = error 
          ? `Video error (${error.code}): ${error.message}` 
          : 'Unknown video error';
        onLoadError?.(errorMessage);
      };

      const handleCanPlay = () => {
        // Auto-play when video can play
        video.play().catch((error) => {
          console.warn('Auto-play failed (expected in some browsers):', error);
          // Browsers may block auto-play, but we'll try again on user interaction
        });
      };

      const handleEnded = () => {
        onEnded?.();
        // If loop is enabled, restart video
        if (loop) {
          video.currentTime = 0;
          video.play().catch(console.error);
        }
      };

      // Add event listeners
      video.addEventListener('loadstart', handleLoadStart);
      video.addEventListener('error', handleError);
      video.addEventListener('canplay', handleCanPlay);
      video.addEventListener('ended', handleEnded);

      // Attempt to play immediately if preload allows
      if (preload === 'auto' && video.readyState >= 3) {
        video.play().catch(() => {
          // Silent fail for auto-play restrictions
        });
      }

      return () => {
        video.removeEventListener('loadstart', handleLoadStart);
        video.removeEventListener('error', handleError);
        video.removeEventListener('canplay', handleCanPlay);
        video.removeEventListener('ended', handleEnded);
      };
    }, [src, onLoadStart, onLoadError, onEnded, loop, preload]);

    // Handle source changes
    useEffect(() => {
      const video = videoRef.current;
      if (video && src) {
        video.load(); // Reload video with new source
      }
    }, [src]);

    return (
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        className={cn(
          'w-full h-full object-cover rounded-lg',
          'pointer-events-none', // Prevent user interaction
          'select-none', // Prevent text selection
          priority && 'z-10',
          className
        )}
        muted={muted}
        loop={loop}
        playsInline
        preload={preload}
        autoPlay
        controls={false} // No user controls
        disablePictureInPicture
        disableRemotePlayback
        onContextMenu={(e) => e.preventDefault()} // Disable right-click menu
        onDoubleClick={(e) => e.preventDefault()} // Disable double-click
        onClick={(e) => e.preventDefault()} // Disable click interactions
        data-testid={testId}
        style={{
          // Ensure no controls are shown
          WebkitAppearance: 'none',
          // Disable text selection
          WebkitUserSelect: 'none',
          userSelect: 'none',
          // Disable drag
          WebkitUserDrag: 'none',
          userDrag: 'none',
        }}
      />
    );
  }
);

AutoPlayVideo.displayName = 'AutoPlayVideo';

export default AutoPlayVideo;