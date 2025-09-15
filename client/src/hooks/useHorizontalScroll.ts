import { useRef, useEffect, useCallback, useState } from 'react';

interface UseHorizontalScrollOptions {
  itemWidth?: number;
  scrollAmount?: number;
  enableKeyboard?: boolean;
  enableTouch?: boolean;
}

export function useHorizontalScroll({
  itemWidth = 160,
  scrollAmount = itemWidth * 2,
  enableKeyboard = true,
  enableTouch = true,
}: UseHorizontalScrollOptions = {}) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showLeftIndicator, setShowLeftIndicator] = useState(false);
  const [showRightIndicator, setShowRightIndicator] = useState(false);
  const [isScrolling, setIsScrolling] = useState(false);

  // Check scroll position and update indicators
  const updateScrollIndicators = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const { scrollLeft, scrollWidth, clientWidth } = container;
    
    setShowLeftIndicator(scrollLeft > 0);
    setShowRightIndicator(scrollLeft < scrollWidth - clientWidth - 1);
  }, []);

  // Smooth scroll to position
  const scrollTo = useCallback((position: number) => {
    const container = scrollContainerRef.current;
    if (!container) return;

    setIsScrolling(true);
    container.scrollTo({
      left: position,
      behavior: 'smooth',
    });

    // Reset scrolling state after animation
    setTimeout(() => setIsScrolling(false), 500);
  }, []);

  // Scroll left by specified amount
  const scrollLeft = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const newPosition = Math.max(0, container.scrollLeft - scrollAmount);
    scrollTo(newPosition);
  }, [scrollAmount, scrollTo]);

  // Scroll right by specified amount
  const scrollRight = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const maxScroll = container.scrollWidth - container.clientWidth;
    const newPosition = Math.min(maxScroll, container.scrollLeft + scrollAmount);
    scrollTo(newPosition);
  }, [scrollAmount, scrollTo]);

  // Keyboard navigation handler (scoped to container)
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enableKeyboard || isScrolling) return;

    // Only handle if the container or its children are focused
    const container = scrollContainerRef.current;
    if (!container || !container.contains(event.target as Node)) return;

    switch (event.key) {
      case 'ArrowLeft':
        event.preventDefault();
        scrollLeft();
        break;
      case 'ArrowRight':
        event.preventDefault();
        scrollRight();
        break;
      case 'Home':
        event.preventDefault();
        scrollTo(0);
        break;
      case 'End':
        event.preventDefault();
        if (container) {
          scrollTo(container.scrollWidth - container.clientWidth);
        }
        break;
    }
  }, [enableKeyboard, isScrolling, scrollLeft, scrollRight, scrollTo]);

  // Touch gesture handling
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container || !enableTouch) return;

    let startX = 0;
    let scrollStartLeft = 0;
    let isDragging = false;
    let momentum = 0;
    let lastMoveTime = 0;
    let lastMoveX = 0;

    const handleTouchStart = (e: TouchEvent) => {
      startX = e.touches[0].clientX;
      scrollStartLeft = container.scrollLeft;
      isDragging = true;
      momentum = 0;
      lastMoveTime = Date.now();
      lastMoveX = startX;
      
      // Prevent default to enable custom scrolling
      e.preventDefault();
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isDragging) return;
      
      e.preventDefault();
      const currentX = e.touches[0].clientX;
      const deltaX = startX - currentX;
      const now = Date.now();
      
      // Calculate momentum for smooth release
      if (now - lastMoveTime > 0) {
        momentum = (lastMoveX - currentX) / (now - lastMoveTime);
      }
      
      container.scrollLeft = scrollStartLeft + deltaX;
      lastMoveTime = now;
      lastMoveX = currentX;
      
      updateScrollIndicators();
    };

    const handleTouchEnd = () => {
      if (!isDragging) return;
      
      isDragging = false;
      
      // Apply momentum scrolling
      if (Math.abs(momentum) > 0.5) {
        const momentumScroll = momentum * 100;
        const targetScroll = Math.max(0, 
          Math.min(
            container.scrollWidth - container.clientWidth,
            container.scrollLeft + momentumScroll
          )
        );
        
        scrollTo(targetScroll);
      }
    };

    // Add touch event listeners
    container.addEventListener('touchstart', handleTouchStart, { passive: false });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd);

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [enableTouch, scrollTo, updateScrollIndicators]);

  // Set up scroll event listener and keyboard events
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    // Handle scroll events
    const handleScroll = () => {
      updateScrollIndicators();
    };

    container.addEventListener('scroll', handleScroll);
    updateScrollIndicators(); // Initial check

    // Keyboard events
    if (enableKeyboard) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      container.removeEventListener('scroll', handleScroll);
      if (enableKeyboard) {
        document.removeEventListener('keydown', handleKeyDown);
      }
    };
  }, [updateScrollIndicators, handleKeyDown, enableKeyboard]);

  // Auto-update indicators on container size changes
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver(() => {
      updateScrollIndicators();
    });

    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
    };
  }, [updateScrollIndicators]);

  return {
    scrollContainerRef,
    scrollLeft,
    scrollRight,
    scrollTo,
    showLeftIndicator,
    showRightIndicator,
    isScrolling,
  };
}