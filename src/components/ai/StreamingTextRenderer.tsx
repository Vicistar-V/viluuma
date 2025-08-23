import { useState, useEffect, useRef, useCallback, useMemo } from 'react';

interface StreamingTextRendererProps {
  text: string;
  typingSpeed?: number;
  onComplete?: () => void;
}

export const StreamingTextRenderer = ({ 
  text, 
  typingSpeed = 50,
  onComplete 
}: StreamingTextRendererProps) => {
  const [displayedText, setDisplayedText] = useState('');
  const intervalRef = useRef<NodeJS.Timeout>();
  const targetTextRef = useRef('');
  const currentIndexRef = useRef(0);
  const isAnimatingRef = useRef(false);

  // Memoize the text to avoid unnecessary re-renders
  const memoizedText = useMemo(() => text, [text]);

  const cleanup = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = undefined;
    }
    isAnimatingRef.current = false;
  }, []);

  const startTypingAnimation = useCallback(() => {
    cleanup();
    
    const targetText = targetTextRef.current;
    if (!targetText) return;

    // Check if we should continue from current position or restart
    const currentText = displayedText;
    let startIndex = 0;
    
    if (targetText.startsWith(currentText) && currentText.length > 0) {
      startIndex = currentText.length;
    } else {
      setDisplayedText('');
      startIndex = 0;
    }

    currentIndexRef.current = startIndex;
    isAnimatingRef.current = true;

    intervalRef.current = setInterval(() => {
      const currentIndex = currentIndexRef.current;
      const target = targetTextRef.current;
      
      if (currentIndex >= target.length) {
        cleanup();
        onComplete?.();
        return;
      }

      // Update displayed text
      const newText = target.slice(0, currentIndex + 1);
      setDisplayedText(newText);
      currentIndexRef.current = currentIndex + 1;
    }, typingSpeed);
  }, [displayedText, typingSpeed, onComplete, cleanup]);

  // Effect to handle text changes
  useEffect(() => {
    if (memoizedText !== targetTextRef.current) {
      targetTextRef.current = memoizedText;
      
      if (memoizedText) {
        startTypingAnimation();
      } else {
        cleanup();
        setDisplayedText('');
      }
    }
  }, [memoizedText, startTypingAnimation, cleanup]);

  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  const showCursor = displayedText.length < memoizedText.length && memoizedText.length > 0;

  return (
    <span>
      {displayedText}
      {showCursor && (
        <span className="inline-block w-2 h-4 ml-1 bg-current animate-pulse">|</span>
      )}
    </span>
  );
};