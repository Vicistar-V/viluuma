import { useEffect, useRef } from 'react';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

export const useMobileAnimations = () => {
  // Mobile-native touch interactions with haptic feedback
  const addTouchFeedback = (element: HTMLElement) => {
    const handleTouchStart = async () => {
      element.style.transform = 'scale(0.98)';
      element.style.transition = 'transform 0.1s ease-out';
      
      // Provide haptic feedback on touch
      try {
        await Haptics.impact({ style: ImpactStyle.Light });
      } catch (error) {
        // Haptics not available in browser - silent fail
      }
    };

    const handleTouchEnd = () => {
      element.style.transform = 'scale(1)';
      element.style.transition = 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)';
    };

    element.addEventListener('touchstart', handleTouchStart);
    element.addEventListener('touchend', handleTouchEnd);
    element.addEventListener('touchcancel', handleTouchEnd);

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchend', handleTouchEnd);
      element.removeEventListener('touchcancel', handleTouchEnd);
    };
  };

  // Staggered fade-in for card lists
  const animateCardEntrance = (elements: HTMLElement[], delay = 0) => {
    elements.forEach((element, index) => {
      element.style.opacity = '0';
      element.style.transform = 'translateY(20px)';
      element.style.transition = 'opacity 0.4s ease-out, transform 0.4s ease-out';
      
      setTimeout(() => {
        element.style.opacity = '1';
        element.style.transform = 'translateY(0)';
      }, delay * 1000 + index * 100);
    });
  };

  // Simple progress bar animation with CSS
  const animateProgressBar = (progressBar: HTMLElement, targetWidth: number) => {
    progressBar.style.width = '0%';
    progressBar.style.transition = 'width 1s cubic-bezier(0.4, 0, 0.2, 1)';
    
    // Use requestAnimationFrame for smooth animation
    requestAnimationFrame(() => {
      progressBar.style.width = `${targetWidth}%`;
    });
  };

  // Mobile-appropriate success pulse animation
  const createSuccessPulse = (element: HTMLElement) => {
    element.classList.add('animate-pulse');
    element.style.boxShadow = '0 0 20px rgba(34, 197, 94, 0.3)';
    
    setTimeout(() => {
      element.classList.remove('animate-pulse');
      element.style.boxShadow = '';
    }, 2000);
  };

  return {
    addTouchFeedback,
    animateCardEntrance,
    animateProgressBar,
    createSuccessPulse
  };
};