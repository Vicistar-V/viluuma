import { useState, useEffect, useRef } from 'react';

interface StreamingTextRendererProps {
  chunks: string[];
  typingSpeed?: number;
  onComplete?: () => void;
}

export const StreamingTextRenderer = ({ 
  chunks, 
  typingSpeed = 30, 
  onComplete 
}: StreamingTextRendererProps) => {
  const [displayedText, setDisplayedText] = useState('');
  const [currentChunkIndex, setCurrentChunkIndex] = useState(0);
  const [currentCharIndex, setCurrentCharIndex] = useState(0);
  const timeoutRef = useRef<NodeJS.Timeout>();
  const isCompletedRef = useRef(false);

  useEffect(() => {
    if (chunks.length === 0) return;

    const typeNextCharacter = () => {
      if (currentChunkIndex >= chunks.length) {
        if (!isCompletedRef.current) {
          isCompletedRef.current = true;
          onComplete?.();
        }
        return;
      }

      const currentChunk = chunks[currentChunkIndex];
      
      if (currentCharIndex >= currentChunk.length) {
        // Move to next chunk
        setCurrentChunkIndex(prev => prev + 1);
        setCurrentCharIndex(0);
        
        // Add a small delay between chunks for natural flow
        timeoutRef.current = setTimeout(typeNextCharacter, typingSpeed * 2);
        return;
      }

      // Add next character
      const nextChar = currentChunk[currentCharIndex];
      setDisplayedText(prev => prev + nextChar);
      setCurrentCharIndex(prev => prev + 1);
      
      // Schedule next character
      timeoutRef.current = setTimeout(typeNextCharacter, typingSpeed);
    };

    // Reset when chunks change
    if (chunks.length > 0) {
      setDisplayedText('');
      setCurrentChunkIndex(0);
      setCurrentCharIndex(0);
      isCompletedRef.current = false;
      typeNextCharacter();
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [chunks, typingSpeed, onComplete]);

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
      {currentChunkIndex < chunks.length && (
        <span className="inline-block w-2 h-4 ml-1 bg-current animate-pulse">|</span>
      )}
    </span>
  );
};