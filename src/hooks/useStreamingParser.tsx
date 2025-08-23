import { useState, useCallback, useRef } from 'react';

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
  
  const previousTextLengthRef = useRef(0);
  const lastExtractedTextRef = useRef('');

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
          old: lastExtractedTextRef.current, 
          new: extractedText,
          length: extractedText.length 
        });
        
        lastExtractedTextRef.current = extractedText;
        previousTextLengthRef.current = extractedText.length;
        
        setState(prev => ({
          ...prev,
          displayText: extractedText,
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
  }, []); // No dependencies to avoid recreation

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
      error: null
    });
    previousTextLengthRef.current = 0;
    lastExtractedTextRef.current = '';
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