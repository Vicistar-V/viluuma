import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import ChatMessage from "@/components/ai/ChatMessage";
import TypingIndicator from "@/components/ai/TypingIndicator";

interface ChatMessageType {
  role: "user" | "assistant";
  content: string;
}

interface ConversationState {
  hasGoalMentioned: boolean;
  hasModalityDetected: boolean;
  detectedModality: "project" | "checklist" | null;
  conversationStage: "gathering_goal" | "clarifying_modality" | "gathering_details" | "ready";
}

const AIOnboardingWizard = () => {
  const [messages, setMessages] = useState<ChatMessageType[]>([
    {
      role: "assistant",
      content:
        "Hey! I'm Viluuma, your friendly AI coach. Tell me what awesome goal is on your mind!",
    },
  ]);
  const [userInput, setUserInput] = useState("");
  const [isAITyping, setIsAITyping] = useState(false);
  const [conversationState, setConversationState] = useState<ConversationState>({
    hasGoalMentioned: false,
    hasModalityDetected: false,
    detectedModality: null,
    conversationStage: "gathering_goal"
  });
  const navigate = useNavigate();
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Helper function to detect modality from user message
  const detectModality = (message: string): "project" | "checklist" | null => {
    const projectKeywords = /\b(project|deadline|by|before|due|timeline|schedule|finished|complete by|need by)\b/i;
    const checklistKeywords = /\b(checklist|ongoing|over time|habit|routine|general|someday|eventually|no deadline|no rush)\b/i;
    
    if (projectKeywords.test(message)) return "project";
    if (checklistKeywords.test(message)) return "checklist";
    return null;
  };

  // Update conversation state based on user input
  const updateConversationState = (userMessage: string) => {
    const detectedModality = detectModality(userMessage);
    
    setConversationState(prev => {
      const hasGoal = prev.hasGoalMentioned || userMessage.length > 10;
      const hasModality = prev.hasModalityDetected || detectedModality !== null;
      
      let stage: ConversationState["conversationStage"] = "gathering_goal";
      
      if (hasGoal && !hasModality) {
        stage = "clarifying_modality";
      } else if (hasGoal && hasModality) {
        stage = detectedModality === "checklist" ? "ready" : "gathering_details";
      }
      
      return {
        hasGoalMentioned: hasGoal,
        hasModalityDetected: hasModality,
        detectedModality: detectedModality || prev.detectedModality,
        conversationStage: stage
      };
    });
  };

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSend = async () => {
    const trimmed = userInput.trim();
    if (!trimmed) return;

    // Update conversation state based on user input
    updateConversationState(trimmed);

    const newUserMessage: ChatMessageType = { role: "user", content: trimmed };
    const outbound = [...messages, newUserMessage];
    setMessages(outbound);
    setUserInput("");
    setIsAITyping(true);

    try {
      // Call Cloudflare Worker instead of Supabase function
      const response = await fetch('https://openrouter-proxy.ogazievictorchi.workers.dev/onboard-goal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: outbound }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'API call failed');

      // Handoff or normal message
      if (data?.status === "ready_to_generate" && data?.intel) {
        setIsAITyping(false);
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content:
              "Awesome, I've got everything I need! Let me work my magic and architect your plan...",
          },
        ]);
        setTimeout(() => {
          navigate("/plan-review", { state: { intel: data.intel } });
        }, 1200);
        return;
      }

      if (data?.type === "message" && typeof data?.content === "string") {
        setIsAITyping(false);
        setMessages((prev) => [...prev, { role: "assistant", content: data.content }]);
      } else if (typeof data === "string") {
        // fallback if function returned plain text
        setIsAITyping(false);
        setMessages((prev) => [...prev, { role: "assistant", content: data }]);
      } else {
        setIsAITyping(false);
        toast({ title: "Unexpected response", variant: "destructive" });
      }
    } catch (e: any) {
      console.error(e);
      setIsAITyping(false);
      toast({ title: "Failed to send", description: String(e?.message || e), variant: "destructive" });
    }
  };

  return (
    <main className="mx-auto max-w-screen-sm p-4 pb-24">
      <h1 className="sr-only">AI Planner Onboarding</h1>
      <div className="space-y-3">
        {messages.map((m, i) => (
          <ChatMessage key={i} role={m.role} content={m.content} />
        ))}
        {isAITyping && <TypingIndicator />}
      </div>

      <Card className="fixed inset-x-0 bottom-0 mx-auto max-w-screen-sm border-t">
        <CardContent className="flex items-center gap-2 p-3">
          <Input
            ref={inputRef}
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            placeholder={
              conversationState.conversationStage === "gathering_goal" 
                ? "Tell me about your goal..." 
                : conversationState.conversationStage === "clarifying_modality"
                ? "Is this a project or ongoing checklist?"
                : "Type your reply..."
            }
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSend();
            }}
          />
          <Button onClick={handleSend} disabled={!userInput.trim()}>
            Send
          </Button>
        </CardContent>
        
        {/* Conversation progress indicator */}
        {conversationState.detectedModality && (
          <div className="px-3 pb-2 text-xs text-muted-foreground text-center">
            Detected: {conversationState.detectedModality === "project" ? "Project with deadline" : "Ongoing checklist"}
            {conversationState.detectedModality === "checklist" && " • Almost done!"}
          </div>
        )}
      </Card>
    </main>
  );
};

export default AIOnboardingWizard;
