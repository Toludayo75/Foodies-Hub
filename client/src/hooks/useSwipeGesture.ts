import { useRef, useCallback } from 'react';

interface SwipeGestureOptions {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  threshold?: number;
  velocityThreshold?: number;
}

export const useSwipeGesture = ({
  onSwipeLeft,
  onSwipeRight,
  threshold = 50,
  velocityThreshold = 0.3
}: SwipeGestureOptions) => {
  const startX = useRef(0);
  const startY = useRef(0);
  const startTime = useRef(0);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    startX.current = e.touches[0].clientX;
    startY.current = e.touches[0].clientY;
    startTime.current = Date.now();
  }, []);

  const handleTouchEnd = useCallback((e: TouchEvent) => {
    const endX = e.changedTouches[0].clientX;
    const endY = e.changedTouches[0].clientY;
    const endTime = Date.now();
    
    const deltaX = endX - startX.current;
    const deltaY = endY - startY.current;
    const deltaTime = endTime - startTime.current;
    
    // Check if it's a horizontal swipe (more horizontal than vertical)
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      const velocity = Math.abs(deltaX) / deltaTime;
      
      // Check if swipe meets threshold and velocity requirements
      if (Math.abs(deltaX) > threshold && velocity > velocityThreshold) {
        if (deltaX > 0 && onSwipeRight) {
          onSwipeRight();
        } else if (deltaX < 0 && onSwipeLeft) {
          onSwipeLeft();
        }
      }
    }
  }, [onSwipeLeft, onSwipeRight, threshold, velocityThreshold]);

  const bindEvents = useCallback((element: HTMLElement | null) => {
    if (!element) return;
    
    element.addEventListener('touchstart', handleTouchStart, { passive: true });
    element.addEventListener('touchend', handleTouchEnd, { passive: true });
    
    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchEnd]);

  return { bindEvents };
};