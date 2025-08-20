import { useEffect, useRef } from 'react';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

export const useMobileAnimations = () => {
  // Touch feedback with haptics
  const handleTouchFeedback = async (intensity: 'light' | 'medium' | 'heavy' = 'light') => {
    try {
      const style = {
        light: ImpactStyle.Light,
        medium: ImpactStyle.Medium,
        heavy: ImpactStyle.Heavy
      }[intensity];
      
      await Haptics.impact({ style });
    } catch (error) {
      // Haptics not available, silently continue
    }
  };

  // Staggered entrance animations for lists
  const useStaggeredEntrance = (itemsCount: number, delay: number = 50) => {
    const itemRefs = useRef<(HTMLElement | null)[]>([]);

    useEffect(() => {
      itemRefs.current.forEach((item, index) => {
        if (item) {
          // Reset initial state
          item.style.opacity = '0';
          item.style.transform = 'translateY(20px) scale(0.95)';
          item.style.transition = 'none';
          
          // Trigger entrance animation with stagger
          setTimeout(() => {
            item.style.transition = 'all 0.4s cubic-bezier(0.23, 1, 0.32, 1)';
            item.style.opacity = '1';
            item.style.transform = 'translateY(0) scale(1)';
          }, index * delay);
        }
      });
    }, [itemsCount, delay]);

    return itemRefs;
  };

  // Success celebration animation
  const triggerSuccessCelebration = (element: HTMLElement) => {
    element.style.animation = 'none';
    element.offsetHeight; // Force reflow
    element.style.animation = 'success-pulse 0.6s cubic-bezier(0.23, 1, 0.32, 1)';
    
    handleTouchFeedback('heavy');
  };

  // Progress bar animation
  const animateProgressBar = (element: HTMLElement, progress: number) => {
    element.style.transition = 'width 0.8s cubic-bezier(0.23, 1, 0.32, 1)';
    element.style.width = `${Math.min(progress, 100)}%`;
  };

  return {
    handleTouchFeedback,
    useStaggeredEntrance,
    triggerSuccessCelebration,
    animateProgressBar
  };
};