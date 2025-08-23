import { useState, useEffect, useRef, useCallback } from 'react';

interface StreamingTextRendererProps {
  text: string;
  typingSpeed?: number;
  onComplete?: () => void;
}

export const StreamingTextRenderer = ({ 
  text, 
  typingSpeed = 80, // Slower, more natural speed
  onComplete 
}: StreamingTextRendererProps) => {
  const [displayedText, setDisplayedText] = useState('');
  const timeoutRef = useRef<NodeJS.Timeout>();
  const isTypingRef = useRef(false);
  const targetTextRef = useRef('');
  const currentIndexRef = useRef(0);

  const cleanup = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = undefined;
    }
    isTypingRef.current = false;
  }, []);

  const typeNextCharacter = useCallback(() => {
    const targetText = targetTextRef.current;
    const currentIndex = currentIndexRef.current;

    if (currentIndex >= targetText.length) {
      // Typing complete
      cleanup();
      onComplete?.();
      return;
    }

    // Add next character
    const nextChar = targetText[currentIndex];
    setDisplayedText(targetText.slice(0, currentIndex + 1));
    currentIndexRef.current = currentIndex + 1;

    // Schedule next character
    timeoutRef.current = setTimeout(typeNextCharacter, typingSpeed);
  }, [typingSpeed, onComplete, cleanup]);

  const startTyping = useCallback(() => {
    if (isTypingRef.current) {
      cleanup();
    }

    const targetText = targetTextRef.current;
    const currentText = displayedText;

    // If the new text starts with what we already have, continue from where we left off
    if (targetText.startsWith(currentText)) {
      currentIndexRef.current = currentText.length;
    } else {
      // Text changed completely, start over
      setDisplayedText('');
      currentIndexRef.current = 0;
    }

    // Only start typing if there's new content to type
    if (currentIndexRef.current < targetText.length) {
      isTypingRef.current = true;
      typeNextCharacter();
    }
  }, [displayedText, typeNextCharacter, cleanup]);

  // Handle text changes
  useEffect(() => {
    if (!text) {
      setDisplayedText('');
      cleanup();
      return;
    }

    targetTextRef.current = text;

    // Start typing if the text is different from what we're currently displaying
    if (text !== displayedText) {
      startTyping();
    }
  }, [text, displayedText, startTyping, cleanup]);

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