import { useState, useRef } from 'react';

interface StreamingAIResponse {
  say_to_user: string;
  next_action: "WAIT_FOR_TEXT_INPUT" | "SHOW_MODALITY_CHOICE" | "SHOW_CALENDAR_PICKER" | "SHOW_COMMITMENT_SLIDER" | "FINALIZE_AND_HANDOFF";
  intel?: {
    title: string;
    modality: "project" | "checklist";
    deadline: string | null;
    commitment: {
      totalHoursPerWeek: number;
      dailyBudget: any;
    } | null;
    context: string;
  };
}

interface UseStreamingAIProps {
  onStreamingStart: () => void;
  onStreamingDelta: (delta: string, accumulated: string) => void;
  onStreamingComplete: (response: StreamingAIResponse) => void;
  onStreamingError: (error: any) => void;
}

export const useStreamingAI = ({
  onStreamingStart,
  onStreamingDelta,
  onStreamingComplete,
  onStreamingError
}: UseStreamingAIProps) => {
  const [isStreaming, setIsStreaming] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const sendMessage = async (conversationHistory: any[], userTimezone: string = 'UTC') => {
    if (isStreaming) {
      console.warn("Already streaming, ignoring new request");
      return;
    }

    setIsStreaming(true);
    onStreamingStart();
    
    // Create abort controller for this request
    abortControllerRef.current = new AbortController();

    try {
      console.log("📤 Starting streaming conversation");
      
      // Use direct fetch to the streaming endpoint
      const projectId = "ilemfubbtpmfzjtcniel"; // Your project ID
      const functionUrl = `https://${projectId}.supabase.co/functions/v1/onboard-goal`;
      
      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlsZW1mdWJidHBtZnpqdGNuaWVsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ5MTE3ODUsImV4cCI6MjA3MDQ4Nzc4NX0.MaSq-FUlq3tUSSevY5-6A-0zdq6UuFtndJC5gRIs3hM`,
        },
        body: JSON.stringify({
          conversationHistory,
          userTimezone
        }),
        signal: abortControllerRef.current.signal
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Check if response is SSE
      const contentType = response.headers.get('content-type');
      if (contentType?.includes('text/event-stream')) {
        console.log("🌊 Handling SSE stream");
        
        // Handle SSE streaming
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        
        if (!reader) {
          throw new Error("No reader available for streaming response");
        }

        let buffer = '';
        
        while (true) {
          const { done, value } = await reader.read();
          
          if (done) break;
          
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          
          // Keep the last incomplete line in buffer
          buffer = lines.pop() || '';
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const eventData = JSON.parse(line.slice(6));
                
                if (eventData.type === 'delta') {
                  onStreamingDelta(eventData.data.delta, eventData.data.accumulated);
                } else if (eventData.type === 'complete') {
                  onStreamingComplete(eventData.data);
                  return;
                } else if (eventData.type === 'error') {
                  onStreamingError(eventData.data);
                  return;
                }
              } catch (e) {
                console.warn("Failed to parse SSE event:", e);
              }
            }
          }
        }
      } else {
        console.log("📦 Handling regular JSON response");
        // Handle regular JSON response as fallback
        const jsonResponse = await response.json();
        onStreamingComplete(jsonResponse);
      }

    } catch (error: any) {
      console.error("❌ Streaming AI error:", error);
      
      if (error.name === 'AbortError') {
        console.log("🛑 Request was aborted");
        return;
      }
      
      onStreamingError(error);
    } finally {
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  };

  const stopStreaming = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsStreaming(false);
    }
  };

  return {
    sendMessage,
    stopStreaming,
    isStreaming
  };
};
