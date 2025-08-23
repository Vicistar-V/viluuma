import { useState, useEffect, useRef, useCallback } from 'react';

interface StreamingTextRendererProps {
  text: string;
  typingSpeed?: number;
  onComplete?: () => void;
}

export const StreamingTextRenderer = ({ 
  text, 
  typingSpeed = 30,
  onComplete 
}: StreamingTextRendererProps) => {
  const [displayedText, setDisplayedText] = useState('');
  const intervalRef = useRef<NodeJS.Timeout>();
  const targetTextRef = useRef('');
  const displayedTextRef = useRef('');
  const currentIndexRef = useRef(0);
  const isAnimatingRef = useRef(false);

  console.log('🎬 StreamingTextRenderer render:', { 
    newText: text.slice(0, 50) + '...', 
    currentDisplayed: displayedText.slice(0, 50) + '...', 
    isAnimating: isAnimatingRef.current 
  });

  const cleanup = useCallback(() => {
    console.log('🧹 Cleaning up animation');
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = undefined;
    }
    isAnimatingRef.current = false;
  }, []);

  const startTypingAnimation = useCallback(() => {
    const targetText = targetTextRef.current;
    const currentDisplayedText = displayedTextRef.current;
    
    console.log('🚀 Starting typing animation:', { 
      target: targetText.slice(0, 50) + '...', 
      current: currentDisplayedText.slice(0, 50) + '...',
      targetLength: targetText.length,
      currentLength: currentDisplayedText.length 
    });

    if (!targetText) {
      console.log('❌ No target text, aborting animation');
      return;
    }

    // If target text hasn't grown from current, don't animate
    if (targetText.length <= currentDisplayedText.length && targetText === currentDisplayedText) {
      console.log('📝 Text unchanged, skipping animation');
      return;
    }

    // If animation is already running and text is growing incrementally, continue from current position
    let startIndex = 0;
    if (isAnimatingRef.current && targetText.startsWith(currentDisplayedText)) {
      startIndex = currentDisplayedText.length;
      console.log('➡️ Continuing animation from index:', startIndex);
    } else {
      // New text or restart needed
      cleanup();
      if (!targetText.startsWith(currentDisplayedText)) {
        console.log('🔄 Text changed, restarting from beginning');
        setDisplayedText('');
        displayedTextRef.current = '';
        startIndex = 0;
      } else {
        startIndex = currentDisplayedText.length;
        console.log('📈 Text grew, continuing from:', startIndex);
      }
    }

    currentIndexRef.current = startIndex;
    isAnimatingRef.current = true;

    intervalRef.current = setInterval(() => {
      const currentIndex = currentIndexRef.current;
      const target = targetTextRef.current;
      
      if (currentIndex >= target.length) {
        console.log('✅ Animation complete');
        cleanup();
        onComplete?.();
        return;
      }

      // Update displayed text
      const newText = target.slice(0, currentIndex + 1);
      setDisplayedText(newText);
      displayedTextRef.current = newText;
      currentIndexRef.current = currentIndex + 1;
    }, typingSpeed);
  }, [typingSpeed, onComplete, cleanup]);

  // Effect to handle text changes - only restart animation if text actually changes
  useEffect(() => {
    if (text !== targetTextRef.current) {
      console.log('📨 New text received:', { 
        old: targetTextRef.current.slice(0, 30) + '...', 
        new: text.slice(0, 30) + '...' 
      });
      
      targetTextRef.current = text;
      
      if (text) {
        startTypingAnimation();
      } else {
        cleanup();
        setDisplayedText('');
        displayedTextRef.current = '';
      }
    }
  }, [text, startTypingAnimation, cleanup]);

  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  const showCursor = displayedText.length < text.length && text.length > 0;

  return (
    <span>
      {displayedText}
      {showCursor && (
        <span className="inline-block w-2 h-4 ml-1 bg-current animate-pulse">|</span>
      )}
    </span>
  );
};