import { useEffect, useRef, useCallback, useState } from 'react';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

export const useMobileAnimations = () => {
  const [touchPos, setTouchPos] = useState({ x: 0, y: 0 });

  // Advanced haptic feedback with patterns
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

  // Advanced multi-pattern haptic feedback
  const triggerHapticPattern = async (pattern: 'success' | 'warning' | 'error' | 'tick') => {
    try {
      switch (pattern) {
        case 'success':
          await Haptics.impact({ style: ImpactStyle.Light });
          setTimeout(() => Haptics.impact({ style: ImpactStyle.Medium }), 100);
          break;
        case 'warning':
          await Haptics.impact({ style: ImpactStyle.Medium });
          setTimeout(() => Haptics.impact({ style: ImpactStyle.Medium }), 150);
          break;
        case 'error':
          await Haptics.impact({ style: ImpactStyle.Heavy });
          break;
        case 'tick':
          await Haptics.impact({ style: ImpactStyle.Light });
          break;
      }
    } catch (error) {
      // Haptics not available
    }
  };

  // Physics-based magnetic touch interactions
  const useMagneticTouch = (sensitivity: number = 0.3) => {
    const elementRef = useRef<HTMLElement>(null);

    const handleMouseMove = useCallback((e: MouseEvent) => {
      if (!elementRef.current) return;
      
      const rect = elementRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      
      const deltaX = (e.clientX - centerX) * sensitivity;
      const deltaY = (e.clientY - centerY) * sensitivity;
      
      elementRef.current.style.transform = `translate3d(${deltaX}px, ${deltaY}px, 0) scale(1.02)`;
    }, [sensitivity]);

    const handleMouseLeave = useCallback(() => {
      if (!elementRef.current) return;
      elementRef.current.style.transform = 'translate3d(0, 0, 0) scale(1)';
    }, []);

    const handleTouchMove = useCallback((e: TouchEvent) => {
      if (!elementRef.current) return;
      
      const touch = e.touches[0];
      const rect = elementRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      
      const deltaX = (touch.clientX - centerX) * sensitivity * 0.5;
      const deltaY = (touch.clientY - centerY) * sensitivity * 0.5;
      
      elementRef.current.style.transform = `translate3d(${deltaX}px, ${deltaY}px, 0) scale(1.01)`;
      setTouchPos({ x: touch.clientX, y: touch.clientY });
    }, [sensitivity]);

    const handleTouchEnd = useCallback(() => {
      if (!elementRef.current) return;
      elementRef.current.style.transform = 'translate3d(0, 0, 0) scale(1)';
    }, []);

    useEffect(() => {
      const element = elementRef.current;
      if (!element) return;

      element.addEventListener('mousemove', handleMouseMove);
      element.addEventListener('mouseleave', handleMouseLeave);
      element.addEventListener('touchmove', handleTouchMove, { passive: true });
      element.addEventListener('touchend', handleTouchEnd);

      return () => {
        element.removeEventListener('mousemove', handleMouseMove);
        element.removeEventListener('mouseleave', handleMouseLeave);
        element.removeEventListener('touchmove', handleTouchMove);
        element.removeEventListener('touchend', handleTouchEnd);
      };
    }, [handleMouseMove, handleMouseLeave, handleTouchMove, handleTouchEnd]);

    return elementRef;
  };

  // Advanced staggered entrance with physics
  const useStaggeredEntrance = (itemsCount: number, delay: number = 80) => {
    const itemRefs = useRef<(HTMLElement | null)[]>([]);

    useEffect(() => {
      itemRefs.current.forEach((item, index) => {
        if (item) {
          // Advanced entrance with spring physics
          item.style.opacity = '0';
          item.style.transform = 'translateY(60px) scale(0.8) rotateX(20deg)';
          item.style.filter = 'blur(8px)';
          item.style.transition = 'none';
          
          setTimeout(() => {
            item.style.transition = 'all 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
            item.style.opacity = '1';
            item.style.transform = 'translateY(0) scale(1) rotateX(0deg)';
            item.style.filter = 'blur(0px)';
            
            // Add spring bounce effect
            setTimeout(() => {
              item.style.transform = 'translateY(-4px) scale(1.02) rotateX(0deg)';
              setTimeout(() => {
                item.style.transform = 'translateY(0) scale(1) rotateX(0deg)';
              }, 150);
            }, 400);
            
          }, index * delay);
        }
      });
    }, [itemsCount, delay]);

    return itemRefs;
  };

  // Particle burst celebration
  const triggerParticleCelebration = (element: HTMLElement, intensity: 'low' | 'medium' | 'high' = 'medium') => {
    const rect = element.getBoundingClientRect();
    const particleCount = { low: 8, medium: 15, high: 25 }[intensity];
    
    for (let i = 0; i < particleCount; i++) {
      const particle = document.createElement('div');
      particle.style.cssText = `
        position: fixed;
        width: 6px;
        height: 6px;
        background: hsl(${Math.random() * 60 + 280}, 70%, 60%);
        border-radius: 50%;
        pointer-events: none;
        z-index: 9999;
        left: ${rect.left + rect.width / 2}px;
        top: ${rect.top + rect.height / 2}px;
      `;
      
      document.body.appendChild(particle);
      
      const angle = (i / particleCount) * Math.PI * 2;
      const velocity = 100 + Math.random() * 80;
      const deltaX = Math.cos(angle) * velocity;
      const deltaY = Math.sin(angle) * velocity;
      
      particle.animate([
        { 
          transform: 'translate(0, 0) scale(1)', 
          opacity: 1,
          filter: 'blur(0px)'
        },
        { 
          transform: `translate(${deltaX}px, ${deltaY}px) scale(0.3)`, 
          opacity: 0,
          filter: 'blur(2px)'
        }
      ], {
        duration: 800 + Math.random() * 400,
        easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)'
      }).onfinish = () => particle.remove();
    }
    
    triggerHapticPattern('success');
  };

  // Advanced success celebration with morphing
  const triggerSuccessCelebration = (element: HTMLElement) => {
    // Morphing scale celebration
    element.style.animation = 'none';
    element.offsetHeight;
    element.style.animation = 'morphing-success 1.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
    
    // Add glow effect
    const originalBoxShadow = element.style.boxShadow;
    element.style.boxShadow = '0 0 30px hsl(var(--success) / 0.4), 0 0 60px hsl(var(--success) / 0.2)';
    
    setTimeout(() => {
      element.style.boxShadow = originalBoxShadow;
      triggerParticleCelebration(element, 'medium');
    }, 600);
    
    triggerHapticPattern('success');
  };

  // Liquid progress animation with wave effect
  const animateLiquidProgress = (element: HTMLElement, progress: number) => {
    const progressElement = element.querySelector('.progress-fill') as HTMLElement;
    if (!progressElement) return;

    // Create wave effect
    progressElement.style.background = `
      linear-gradient(90deg, 
        hsl(var(--primary) / 0.8) 0%,
        hsl(var(--primary) / 0.9) 25%,
        hsl(var(--primary) / 1) 50%,
        hsl(var(--primary) / 0.9) 75%,
        hsl(var(--primary) / 0.8) 100%
      )
    `;
    
    progressElement.style.transition = 'width 1.2s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
    progressElement.style.width = `${Math.min(progress, 100)}%`;
    
    // Add shimmer effect
    progressElement.style.backgroundSize = '200% 100%';
    progressElement.style.animation = 'shimmer-wave 2s infinite';
  };

  // Advanced touch ripple effect
  const createTouchRipple = (element: HTMLElement, event: TouchEvent | MouseEvent) => {
    const ripple = document.createElement('div');
    const rect = element.getBoundingClientRect();
    
    const x = 'touches' in event ? event.touches[0].clientX - rect.left : event.clientX - rect.left;
    const y = 'touches' in event ? event.touches[0].clientY - rect.top : event.clientY - rect.top;
    
    ripple.style.cssText = `
      position: absolute;
      border-radius: 50%;
      background: hsl(var(--primary) / 0.2);
      transform: scale(0);
      pointer-events: none;
      left: ${x}px;
      top: ${y}px;
      width: 20px;
      height: 20px;
      margin-left: -10px;
      margin-top: -10px;
    `;
    
    element.style.position = 'relative';
    element.style.overflow = 'hidden';
    element.appendChild(ripple);
    
    ripple.animate([
      { transform: 'scale(0)', opacity: 0.6 },
      { transform: 'scale(4)', opacity: 0 }
    ], {
      duration: 600,
      easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)'
    }).onfinish = () => ripple.remove();
    
    handleTouchFeedback('light');
  };

  return {
    handleTouchFeedback,
    triggerHapticPattern,
    useMagneticTouch,
    useStaggeredEntrance,
    triggerSuccessCelebration,
    triggerParticleCelebration,
    animateLiquidProgress,
    createTouchRipple,
    touchPos
  };
};