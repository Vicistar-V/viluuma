import { useState, useEffect, useRef } from 'react';

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
  const [currentCharIndex, setCurrentCharIndex] = useState(0);
  const timeoutRef = useRef<NodeJS.Timeout>();
  const isCompletedRef = useRef(false);
  const previousTextRef = useRef('');

  useEffect(() => {
    // Reset if text changed significantly (not just appended)
    if (!text.startsWith(previousTextRef.current)) {
      setDisplayedText('');
      setCurrentCharIndex(0);
      isCompletedRef.current = false;
      previousTextRef.current = '';
    }

    if (!text) return;

    const typeNextCharacter = () => {
      if (currentCharIndex >= text.length) {
        if (!isCompletedRef.current && text === displayedText) {
          isCompletedRef.current = true;
          onComplete?.();
        }
        return;
      }

      // Add next character
      const nextChar = text[currentCharIndex];
      setDisplayedText(prev => prev + nextChar);
      setCurrentCharIndex(prev => prev + 1);
      
      // Schedule next character
      timeoutRef.current = setTimeout(typeNextCharacter, typingSpeed);
    };

    // Start typing if we have new content
    if (text.length > displayedText.length && currentCharIndex <= text.length) {
      // Clear any existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      // If text was extended, continue from where we left off
      if (text.startsWith(displayedText)) {
        typeNextCharacter();
      } else {
        // Text was replaced, start over
        setDisplayedText('');
        setCurrentCharIndex(0);
        isCompletedRef.current = false;
        typeNextCharacter();
      }
    }

    previousTextRef.current = text;

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [text, typingSpeed, onComplete, currentCharIndex, displayedText]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <span>
      {displayedText}
      {currentCharIndex < text.length && (
        <span className="inline-block w-2 h-4 ml-1 bg-current animate-pulse">|</span>
      )}
    </span>
  );
};