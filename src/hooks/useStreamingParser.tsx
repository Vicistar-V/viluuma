import { useState, useCallback } from 'react';

interface StreamingParserState {
  textChunks: string[];
  isComplete: boolean;
  error: string | null;
}

export const useStreamingParser = () => {
  const [state, setState] = useState<StreamingParserState>({
    textChunks: [],
    isComplete: false,
    error: null
  });

  const processRawChunk = useCallback((rawDelta: string, accumulated: string) => {
    try {
      // Extract clean text from the delta
      let cleanText = rawDelta;
      
      // Remove any JSON artifacts or formatting
      cleanText = cleanText.replace(/^\s*["']|["']\s*$/g, ''); // Remove surrounding quotes
      cleanText = cleanText.replace(/\\n/g, '\n'); // Convert escaped newlines
      cleanText = cleanText.replace(/\\"/g, '"'); // Convert escaped quotes
      
      // Only add non-empty chunks
      if (cleanText.trim()) {
        setState(prev => ({
          ...prev,
          textChunks: [...prev.textChunks, cleanText],
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
  }, []);

  const markComplete = useCallback(() => {
    setState(prev => ({
      ...prev,
      isComplete: true
    }));
  }, []);

  const reset = useCallback(() => {
    setState({
      textChunks: [],
      isComplete: false,
      error: null
    });
  }, []);

  return {
    textChunks: state.textChunks,
    isComplete: state.isComplete,
    error: state.error,
    processRawChunk,
    markComplete,
    reset
  };
};