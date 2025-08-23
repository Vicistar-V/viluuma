import { useState, useEffect, useRef, useCallback } from 'react';

interface StreamingTextRendererProps {
  text: string;
  typingSpeed?: number;
  onComplete?: () => void;
}

export const StreamingTextRenderer = ({ 
  text, 
  typingSpeed = 50, // Faster but still natural
  onComplete 
}: StreamingTextRendererProps) => {
  const [displayedText, setDisplayedText] = useState('');
  const animationFrameRef = useRef<number>();
  const timeoutRef = useRef<NodeJS.Timeout>();
  const isTypingRef = useRef(false);
  const startTimeRef = useRef<number>();
  const targetTextRef = useRef('');

  const cleanup = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = undefined;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = undefined;
    }
    isTypingRef.current = false;
  }, []);

  const animateTyping = useCallback(() => {
    const targetText = targetTextRef.current;
    const currentTime = Date.now();
    const elapsed = currentTime - (startTimeRef.current || currentTime);
    const targetLength = Math.min(
      Math.floor(elapsed / typingSpeed) + 1,
      targetText.length
    );

    if (targetLength >= targetText.length) {
      // Animation complete
      setDisplayedText(targetText);
      cleanup();
      onComplete?.();
      return;
    }

    // Update displayed text
    setDisplayedText(targetText.slice(0, targetLength));
    
    // Schedule next frame
    animationFrameRef.current = requestAnimationFrame(animateTyping);
  }, [typingSpeed, onComplete, cleanup]);

  const startTyping = useCallback((newText: string) => {
    if (isTypingRef.current) {
      cleanup();
    }

    targetTextRef.current = newText;
    
    // If text is empty, just clear
    if (!newText) {
      setDisplayedText('');
      return;
    }

    // If new text starts with current text, continue from where we left off
    const currentLength = displayedText.length;
    if (newText.startsWith(displayedText) && currentLength < newText.length) {
      // Continue typing from current position
      startTimeRef.current = Date.now() - (currentLength * typingSpeed);
    } else if (newText !== displayedText) {
      // Text changed, start over
      setDisplayedText('');
      startTimeRef.current = Date.now();
    } else {
      // Text is the same, no need to animate
      return;
    }

    isTypingRef.current = true;
    animationFrameRef.current = requestAnimationFrame(animateTyping);
  }, [displayedText, typingSpeed, animateTyping, cleanup]);

  // Handle text changes
  useEffect(() => {
    if (text !== targetTextRef.current) {
      console.log('🎬 Text changed for animation:', { from: displayedText, to: text });
      startTyping(text);
    }
  }, [text, startTyping, displayedText]);

  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  const isStillTyping = displayedText.length < text.length && text.length > 0;

  return (
    <span>
      {displayedText}
      {isStillTyping && (
        <span className="inline-block w-2 h-4 ml-1 bg-current animate-pulse">|</span>
      )}
    </span>
  );
};