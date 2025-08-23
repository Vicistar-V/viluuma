import { useState, useCallback } from 'react';

interface StreamingParserState {
  displayText: string;
  isComplete: boolean;
  error: string | null;
  previousTextLength: number;
}

export const useStreamingParser = () => {
  const [state, setState] = useState<StreamingParserState>({
    displayText: '',
    isComplete: false,
    error: null,
    previousTextLength: 0
  });

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

      // Only update if we have new text content
      if (extractedText && extractedText.length > state.previousTextLength) {
        setState(prev => ({
          ...prev,
          displayText: extractedText,
          previousTextLength: extractedText.length,
          error: null
        }));
      }
    } catch (error) {
      console.warn('Error processing streaming chunk:', error);
      setState(prev => ({
        ...prev,
        error: 'Failed to process streaming text'
      }));
    }
  }, [state.previousTextLength]);

  const markComplete = useCallback(() => {
    setState(prev => ({
      ...prev,
      isComplete: true
    }));
  }, []);

  const reset = useCallback(() => {
    setState({
      displayText: '',
      isComplete: false,
      error: null,
      previousTextLength: 0
    });
  }, []);

  return {
    displayText: state.displayText,
    isComplete: state.isComplete,
    error: state.error,
    processRawChunk,
    markComplete,
    reset
  };
};