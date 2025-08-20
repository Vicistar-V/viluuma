import { useEffect, useRef, useCallback } from 'react';
import { gsap } from 'gsap';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

export const useMobileAnimations = () => {
  // Physics-based liquid morphing effect
  const createLiquidMorph = useCallback((element: HTMLElement) => {
    if (!element) return () => {};
    
    const tl = gsap.timeline({ paused: true });
    
    try {
      tl.to(element, {
        scale: 0.95,
        borderRadius: "50px",
        duration: 0.2,
        ease: "power2.out"
      })
      .to(element, {
        scale: 1.05,
        borderRadius: "20px", 
        duration: 0.3,
        ease: "elastic.out(1, 0.3)"
      })
      .to(element, {
        scale: 1,
        borderRadius: "16px",
        duration: 0.2,
        ease: "power2.out"
      });

      const handleTouch = async () => {
        try {
          await Haptics.impact({ style: ImpactStyle.Medium });
          tl.restart();
        } catch (e) {
          console.warn('Animation or haptics failed:', e);
        }
      };

      element.addEventListener('touchstart', handleTouch);
      return () => {
        element.removeEventListener('touchstart', handleTouch);
        tl.kill();
      };
    } catch (error) {
      console.warn('Failed to create liquid morph animation:', error);
      return () => {};
    }
  }, []);

  // Advanced particle burst system
  const createParticleBurst = useCallback((container: HTMLElement, color = '#22c55e') => {
    if (!container || !color) return;
    
    const particles: HTMLElement[] = [];
    const particleCount = 12;
    
    try {
      for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        particle.className = 'absolute pointer-events-none';
        particle.style.width = '4px';
        particle.style.height = '4px';
        particle.style.backgroundColor = color;
        particle.style.borderRadius = '50%';
        particle.style.position = 'absolute';
        particle.style.top = '50%';
        particle.style.left = '50%';
        particle.style.transform = 'translate(-50%, -50%)';
        particle.style.pointerEvents = 'none';
        
        container.appendChild(particle);
        particles.push(particle);
      }

      // Complex burst animation with physics
      particles.forEach((particle, i) => {
        const angle = (i / particleCount) * Math.PI * 2;
        const distance = gsap.utils.random(80, 150);
        const x = Math.cos(angle) * distance;
        const y = Math.sin(angle) * distance;
        
        try {
          gsap.timeline()
            .to(particle, {
              x,
              y,
              scale: gsap.utils.random(0.5, 2),
              opacity: 0.8,
              duration: 0.6,
              ease: "power2.out"
            })
            .to(particle, {
              opacity: 0,
              scale: 0,
              duration: 0.4,
              ease: "power2.in",
              onComplete: () => {
                try {
                  if (particle.parentNode) {
                    particle.parentNode.removeChild(particle);
                  }
                } catch (e) {
                  console.warn('Failed to remove particle:', e);
                }
              }
            }, 0.3);
        } catch (error) {
          console.warn('Failed to animate particle:', error);
          if (particle.parentNode) {
            particle.parentNode.removeChild(particle);
          }
        }
      });
    } catch (error) {
      console.warn('Failed to create particle burst:', error);
    }
  }, []);

  // Staggered wave entrance with complex easing
  const animateCardEntrance = useCallback((elements: HTMLElement[], delay = 0) => {
    const tl = gsap.timeline({ delay });
    
    // Set initial state
    gsap.set(elements, {
      y: 100,
      opacity: 0,
      scale: 0.8,
      rotationX: 90,
      transformOrigin: "center bottom"
    });
    
    // Create wave effect
    tl.to(elements, {
      y: 0,
      opacity: 1,
      scale: 1,
      rotationX: 0,
      duration: 0.8,
      stagger: {
        amount: 0.6,
        from: "start",
        ease: "power2.out"
      },
      ease: "back.out(1.7)"
    })
    .to(elements, {
      y: -10,
      duration: 0.3,
      stagger: 0.1,
      ease: "power2.out"
    }, "-=0.2")
    .to(elements, {
      y: 0,
      duration: 0.4,
      stagger: 0.1,
      ease: "bounce.out"
    });
  }, []);

  // Organic progress bar with liquid flow
  const animateProgressBar = useCallback((progressBar: HTMLElement, targetWidth: number) => {
    if (!progressBar || typeof targetWidth !== 'number') return;
    
    try {
      // Create liquid flow effect
      const flowGradient = document.createElement('div');
      flowGradient.className = 'absolute inset-0 pointer-events-none';
      flowGradient.style.background = 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 30%, rgba(255,255,255,0.6) 50%, rgba(255,255,255,0.4) 70%, transparent 100%)';
      flowGradient.style.transform = 'translateX(-100%)';
      flowGradient.style.borderRadius = 'inherit';
      flowGradient.style.pointerEvents = 'none';
      
      progressBar.appendChild(flowGradient);

      // Animate progress with elastic effect
      const tl = gsap.timeline();
      
      tl.to(progressBar, {
        width: `${Math.max(0, Math.min(100, targetWidth))}%`,
        duration: 1.2,
        ease: "power2.out",
        onUpdate: function() {
          try {
            // Add subtle morphing during animation
            const progress = this.progress();
            progressBar.style.transform = `scaleY(${1 + Math.sin(progress * Math.PI) * 0.1})`;
          } catch (e) {
            console.warn('Progress bar update failed:', e);
          }
        }
      })
      .to(flowGradient, {
        x: '200%',
        duration: 1.5,
        ease: "power2.inOut"
      }, 0.2)
      .to(progressBar, {
        transform: 'scaleY(1)',
        duration: 0.3,
        ease: "elastic.out(1, 0.3)"
      });
    } catch (error) {
      console.warn('Failed to animate progress bar:', error);
      // Fallback to simple CSS animation
      progressBar.style.width = `${Math.max(0, Math.min(100, targetWidth))}%`;
      progressBar.style.transition = 'width 1s ease-out';
    }
  }, []);

  // Success celebration with multiple effects
  const createSuccessPulse = useCallback((element: HTMLElement) => {
    if (!element) return;
    
    try {
      // Create ripple effect
      const ripple = document.createElement('div');
      ripple.className = 'absolute inset-0 pointer-events-none';
      ripple.style.border = '2px solid #22c55e';
      ripple.style.borderRadius = 'inherit';
      ripple.style.transform = 'scale(1)';
      ripple.style.opacity = '0';
      ripple.style.pointerEvents = 'none';
      
      element.appendChild(ripple);

      // Complex celebration timeline
      const tl = gsap.timeline();
      
      tl.to(ripple, {
        scale: 1.5,
        opacity: 1,
        duration: 0.3,
        ease: "power2.out"
      })
      .to(ripple, {
        scale: 2,
        opacity: 0,
        duration: 0.5,
        ease: "power2.out"
      }, "-=0.1")
      .to(element, {
        scale: 1.05,
        duration: 0.2,
        ease: "back.out(2)",
        yoyo: true,
        repeat: 1
      }, 0)
      .call(() => {
        createParticleBurst(element, '#22c55e');
        try {
          if (ripple.parentNode) {
            ripple.parentNode.removeChild(ripple);
          }
        } catch (e) {
          console.warn('Failed to remove ripple:', e);
        }
      }, [], 0.3);
    } catch (error) {
      console.warn('Failed to create success pulse:', error);
    }
  }, [createParticleBurst]);

  // Magnetic field effect for touch interactions
  const addTouchFeedback = useCallback((element: HTMLElement) => {
    let isPressed = false;
    
    const handleTouchStart = async (e: TouchEvent) => {
      if (isPressed) return;
      isPressed = true;
      
      const touch = e.touches[0];
      const rect = element.getBoundingClientRect();
      const x = touch.clientX - rect.left - rect.width / 2;
      const y = touch.clientY - rect.top - rect.height / 2;
      
      // Magnetic distortion effect
      gsap.timeline()
        .to(element, {
          x: x * 0.1,
          y: y * 0.1,
          scale: 0.95,
          rotationX: y * 0.02,
          rotationY: x * 0.02,
          duration: 0.2,
          ease: "power2.out"
        })
        .to(element, {
          boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
          duration: 0.2,
          ease: "power2.out"
        }, 0);

      try {
        await Haptics.impact({ style: ImpactStyle.Light });
      } catch (e) {}
    };

    const handleTouchEnd = () => {
      if (!isPressed) return;
      isPressed = false;
      
      gsap.to(element, {
        x: 0,
        y: 0,
        scale: 1,
        rotationX: 0,
        rotationY: 0,
        boxShadow: '0 10px 20px rgba(0,0,0,0.1)',
        duration: 0.4,
        ease: "elastic.out(1, 0.3)"
      });
    };

    element.addEventListener('touchstart', handleTouchStart);
    element.addEventListener('touchend', handleTouchEnd);
    element.addEventListener('touchcancel', handleTouchEnd);

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchend', handleTouchEnd);
      element.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, []);

  return {
    createLiquidMorph,
    createParticleBurst,
    animateCardEntrance,
    animateProgressBar,
    createSuccessPulse,
    addTouchFeedback
  };
};