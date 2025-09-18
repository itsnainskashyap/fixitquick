import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Timer, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CountdownTimerProps {
  expiresAt: string;
  onExpired?: () => void;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  format?: 'mm:ss' | 'full';
}

interface TimeRemaining {
  total: number;
  minutes: number;
  seconds: number;
  isExpired: boolean;
}

export function CountdownTimer({ 
  expiresAt, 
  onExpired, 
  className,
  size = 'md',
  showIcon = true,
  format = 'mm:ss'
}: CountdownTimerProps) {
  const [timeRemaining, setTimeRemaining] = useState<TimeRemaining>({
    total: 0,
    minutes: 0,
    seconds: 0,
    isExpired: false
  });

  const calculateTimeRemaining = (expiryTime: string): TimeRemaining => {
    const now = Date.now();
    const expiry = new Date(expiryTime).getTime();
    const difference = expiry - now;

    if (difference <= 0) {
      return {
        total: 0,
        minutes: 0,
        seconds: 0,
        isExpired: true
      };
    }

    const minutes = Math.floor((difference / 1000 / 60) % 60);
    const seconds = Math.floor((difference / 1000) % 60);

    return {
      total: difference,
      minutes,
      seconds,
      isExpired: false
    };
  };

  useEffect(() => {
    const updateTimer = () => {
      const remaining = calculateTimeRemaining(expiresAt);
      setTimeRemaining(remaining);

      if (remaining.isExpired && onExpired) {
        onExpired();
      }
    };

    // Update immediately
    updateTimer();

    // Set up interval for real-time updates
    const interval = setInterval(updateTimer, 1000);

    return () => {
      clearInterval(interval);
    };
  }, [expiresAt, onExpired]);

  const formatTime = (minutes: number, seconds: number): string => {
    if (format === 'full') {
      return `${minutes}:${seconds.toString().padStart(2, '0')} remaining`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const getVariant = (): "default" | "secondary" | "destructive" | "outline" => {
    if (timeRemaining.isExpired) return "destructive";
    if (timeRemaining.total <= 60000) return "destructive"; // Last minute
    if (timeRemaining.total <= 120000) return "outline"; // Last 2 minutes
    return "default";
  };

  const getDisplayText = (): string => {
    if (timeRemaining.isExpired) {
      return "EXPIRED";
    }
    return formatTime(timeRemaining.minutes, timeRemaining.seconds);
  };

  const sizeClasses = {
    sm: "text-xs px-2 py-1",
    md: "text-sm px-3 py-1.5", 
    lg: "text-base px-4 py-2"
  };

  const iconSizes = {
    sm: "h-3 w-3",
    md: "h-4 w-4",
    lg: "h-5 w-5"
  };

  return (
    <Badge 
      variant={getVariant()}
      className={cn(
        "font-mono tabular-nums transition-all duration-200",
        sizeClasses[size],
        timeRemaining.isExpired && "animate-pulse",
        timeRemaining.total <= 60000 && !timeRemaining.isExpired && "animate-pulse",
        className
      )}
      data-testid={`countdown-timer-${timeRemaining.isExpired ? 'expired' : 'active'}`}
    >
      {showIcon && (
        timeRemaining.isExpired ? (
          <AlertTriangle className={cn("mr-1.5", iconSizes[size])} />
        ) : (
          <Timer className={cn("mr-1.5", iconSizes[size])} />
        )
      )}
      <span className="font-semibold">
        {getDisplayText()}
      </span>
    </Badge>
  );
}

// Hook for managing multiple countdown timers
export function useCountdownTimer(expiresAt: string) {
  const [timeRemaining, setTimeRemaining] = useState<TimeRemaining>({
    total: 0,
    minutes: 0,
    seconds: 0,
    isExpired: false
  });

  const calculateTimeRemaining = (expiryTime: string): TimeRemaining => {
    const now = Date.now();
    const expiry = new Date(expiryTime).getTime();
    const difference = expiry - now;

    if (difference <= 0) {
      return {
        total: 0,
        minutes: 0,
        seconds: 0,
        isExpired: true
      };
    }

    const minutes = Math.floor((difference / 1000 / 60) % 60);
    const seconds = Math.floor((difference / 1000) % 60);

    return {
      total: difference,
      minutes,
      seconds,
      isExpired: false
    };
  };

  useEffect(() => {
    const updateTimer = () => {
      const remaining = calculateTimeRemaining(expiresAt);
      setTimeRemaining(remaining);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => {
      clearInterval(interval);
    };
  }, [expiresAt]);

  return timeRemaining;
}

export default CountdownTimer;