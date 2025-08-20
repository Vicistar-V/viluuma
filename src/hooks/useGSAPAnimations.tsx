import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';

export const useGSAPAnimations = () => {
  // Staggered entrance animation for multiple cards
  const animateCardEntrance = (elements: HTMLElement[], delay = 0) => {
    gsap.fromTo(elements, 
      {
        y: 60,
        opacity: 0,
        scale: 0.9,
        rotateX: 15
      },
      {
        y: 0,
        opacity: 1,
        scale: 1,
        rotateX: 0,
        duration: 0.8,
        delay,
        stagger: 0.1,
        ease: "back.out(1.7)"
      }
    );
  };

  // Magnetic hover effect - card follows cursor
  const createMagneticEffect = (element: HTMLElement) => {
    const handleMouseMove = (e: MouseEvent) => {
      const rect = element.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;
      
      gsap.to(element, {
        x: x * 0.1,
        y: y * 0.1,
        rotateX: y * 0.05,
        rotateY: x * 0.05,
        duration: 0.3,
        ease: "power2.out"
      });
    };

    const handleMouseLeave = () => {
      gsap.to(element, {
        x: 0,
        y: 0,
        rotateX: 0,
        rotateY: 0,
        duration: 0.5,
        ease: "elastic.out(1, 0.3)"
      });
    };

    element.addEventListener('mousemove', handleMouseMove);
    element.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      element.removeEventListener('mousemove', handleMouseMove);
      element.removeEventListener('mouseleave', handleMouseLeave);
    };
  };

  // Floating particles animation
  const createFloatingParticles = (container: HTMLElement) => {
    const particles: HTMLElement[] = [];
    
    // Create particles
    for (let i = 0; i < 6; i++) {
      const particle = document.createElement('div');
      particle.className = 'absolute w-1 h-1 bg-gradient-to-r from-primary/30 to-accent/30 rounded-full pointer-events-none';
      particle.style.left = Math.random() * 100 + '%';
      particle.style.top = Math.random() * 100 + '%';
      container.appendChild(particle);
      particles.push(particle);
    }

    // Animate particles
    particles.forEach((particle, i) => {
      gsap.to(particle, {
        y: "random(-20, 20)",
        x: "random(-20, 20)",
        opacity: "random(0.3, 0.8)",
        scale: "random(0.5, 1.5)",
        duration: "random(3, 6)",
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
        delay: i * 0.2
      });
    });

    return () => {
      particles.forEach(particle => particle.remove());
    };
  };

  // Progress bar wave animation
  const animateProgressBar = (progressBar: HTMLElement, targetWidth: number) => {
    const wave = document.createElement('div');
    wave.className = 'absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent';
    wave.style.width = '30%';
    wave.style.transform = 'translateX(-100%)';
    progressBar.appendChild(wave);

    // Animate the progress bar fill
    gsap.to(progressBar, {
      width: `${targetWidth}%`,
      duration: 1.5,
      ease: "power2.out"
    });

    // Animate the wave effect
    gsap.to(wave, {
      x: '400%',
      duration: 1.8,
      ease: "power2.inOut",
      delay: 0.3,
      onComplete: () => wave.remove()
    });
  };

  // Morphing card effect on update
  const morphCard = (element: HTMLElement) => {
    const tl = gsap.timeline();
    
    tl.to(element, {
      scaleY: 0.8,
      skewX: 2,
      duration: 0.2,
      ease: "power2.in"
    })
    .to(element, {
      scaleY: 1.05,
      skewX: 0,
      duration: 0.3,
      ease: "back.out(2)"
    })
    .to(element, {
      scaleY: 1,
      duration: 0.2,
      ease: "power2.out"
    });
  };

  // Pulsing glow effect
  const createPulseGlow = (element: HTMLElement, color = 'primary') => {
    gsap.to(element, {
      boxShadow: `0 0 30px hsl(var(--${color}) / 0.4)`,
      duration: 2,
      repeat: -1,
      yoyo: true,
      ease: "sine.inOut"
    });
  };

  // 3D flip animation
  const flipCard = (element: HTMLElement) => {
    const tl = gsap.timeline();
    
    tl.to(element, {
      rotateY: 90,
      duration: 0.3,
      ease: "power2.in"
    })
    .set(element, {
      // Change content here if needed
    })
    .to(element, {
      rotateY: 0,
      duration: 0.3,
      ease: "power2.out"
    });
  };

  return {
    animateCardEntrance,
    createMagneticEffect,
    createFloatingParticles,
    animateProgressBar,
    morphCard,
    createPulseGlow,
    flipCard
  };
};