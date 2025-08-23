import { useState, useCallback, useRef, useMemo } from 'react';

interface StreamingParserState {
  displayText: string;
  isComplete: boolean;
  error: string | null;
}

export const useStreamingParser = () => {
  const [state, setState] = useState<StreamingParserState>({
    displayText: '',
    isComplete: false,
    error: null
  });
  
  const lastExtractedTextRef = useRef('');
  const updateTimeoutRef = useRef<NodeJS.Timeout>();

  // Debounced state update to prevent React queue issues
  const debouncedSetState = useCallback((newText: string) => {
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
    }
    
    updateTimeoutRef.current = setTimeout(() => {
      setState(prev => ({
        ...prev,
        displayText: newText,
        error: null
      }));
    }, 16); // ~60fps update rate
  }, []);

  const processRawChunk = useCallback((rawDelta: string, accumulated: string) => {
    try {
      // Try to parse the accumulated JSON to extract the text content
      let extractedText = '';
      
      try {
        // Attempt to parse the accumulated JSON
        const parsed = JSON.parse(accumulated);
        if (parsed.say_to_user) {
          extractedText = parsed.say_to_user;
        }
      } catch (jsonError) {
        // If JSON is incomplete, try to extract partial text using regex
        const sayToUserMatch = accumulated.match(/"say_to_user":\s*"([^"]*(?:\\.[^"]*)*)/);
        if (sayToUserMatch) {
          // Unescape the extracted text
          extractedText = sayToUserMatch[1]
            .replace(/\\"/g, '"')
            .replace(/\\n/g, '\n')
            .replace(/\\\\/g, '\\');
        }
      }

      // Only update if we have new text content and it's different from what we had
      if (extractedText && extractedText !== lastExtractedTextRef.current) {
        console.log('📝 Parser extracted text:', { 
          old: lastExtractedTextRef.current.slice(0, 50) + '...', 
          new: extractedText.slice(0, 50) + '...',
          length: extractedText.length 
        });
        
        lastExtractedTextRef.current = extractedText;
        debouncedSetState(extractedText);
      }
    } catch (error) {
      console.warn('Error processing streaming chunk:', error);
      setState(prev => ({
        ...prev,
        error: 'Failed to process streaming text'
      }));
    }
  }, [debouncedSetState]);

  const markComplete = useCallback(() => {
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
    }
    setState(prev => ({
      ...prev,
      isComplete: true
    }));
  }, []);

  const reset = useCallback(() => {
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
    }
    setState({
      displayText: '',
      isComplete: false,
      error: null
    });
    lastExtractedTextRef.current = '';
  }, []);

  // Cleanup on unmount
  const cleanup = useCallback(() => {
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
    }
  }, []);

  // Memoize the return object to prevent unnecessary re-renders
  const returnValue = useMemo(() => ({
    displayText: state.displayText,
    isComplete: state.isComplete,
    error: state.error,
    processRawChunk,
    markComplete,
    reset,
    cleanup
  }), [state.displayText, state.isComplete, state.error, processRawChunk, markComplete, reset, cleanup]);

  return returnValue;
};