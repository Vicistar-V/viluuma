import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import ChatMessage from "@/components/ai/ChatMessage";
import TypingIndicator from "@/components/ai/TypingIndicator";
import HandoffConfirmation from "@/components/ai/HandoffConfirmation";
import CommitmentProfileUI from "@/components/ai/CommitmentProfileUI";
import DatePickerInChat from "@/components/ai/DatePickerInChat";
import ChoiceButtons from "@/components/ai/ChoiceButtons";
import { 
  ChatMessageType, 
  Intel, 
  DailyBudget, 
  CommitmentData, 
  UserConstraints,
  createDefaultDailyBudget
} from "@/types/onboarding";

// AI State Engine Response Types
interface AIStateResponse {
  response_for_user: string;
  state_analysis: {
    status: "needs_title" | "needs_modality" | "needs_deadline" | "needs_commitment" | "ready_to_generate";
    intel: {
      title: string | null;
      modality: "project" | "checklist" | null;
      deadline: string | null;
      commitment: {
        type: "daily" | "weekly" | null;
        value: number | object | null;
      } | null;
      context: string;
    };
  };
}

const AIOnboardingWizard = () => {
  const [messages, setMessages] = useState<ChatMessageType[]>([
    {
      role: "assistant",
      content: "Hey! I'm Viluuma, your friendly AI coach. What awesome goal is on your mind? 🎯",
    },
  ]);
  const [userInput, setUserInput] = useState("");
  const [isAITyping, setIsAITyping] = useState(false);
  const [currentAIState, setCurrentAIState] = useState<AIStateResponse | null>(null);
  const [showHandoff, setShowHandoff] = useState(false);
  const [showChoices, setShowChoices] = useState(false);
  const [handoffData, setHandoffData] = useState<{intel: Intel, userConstraints: UserConstraints} | null>(null);
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSend = async (userMessage?: string) => {
    const message = userMessage || userInput.trim();
    if (!message || isAITyping) return;

    // Add user message to conversation
    const newUserMessage: ChatMessageType = { role: "user", content: message };
    const updatedMessages = [...messages, newUserMessage];
    setMessages(updatedMessages);
    setUserInput("");
    setIsAITyping(true);

    // Hide any UI elements
    setShowChoices(false);

    try {
      console.log("📤 Sending conversation to AI State Engine");
      
      const { data, error } = await supabase.functions.invoke("onboard-goal", {
        body: { 
          conversationHistory: updatedMessages,
          userTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone
        },
      });
      
      if (error) {
        console.error("❌ Supabase function error:", error);
        throw error;
      }

      console.log("📥 AI State Engine Response:", data);

      // Set the AI state for further processing
      setCurrentAIState(data);
      setIsAITyping(false);

      // Add AI response to messages
      setMessages((prev) => [
        ...prev, 
        { role: "assistant", content: data.response_for_user }
      ]);

      // Handle different states based on AI's analysis
      handleAIState(data);

    } catch (error: any) {
      console.error("❌ Error in conversation:", error);
      setIsAITyping(false);
      
      // Add a fallback assistant message for better UX
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Sorry, I had a hiccup there! Can you tell me again about your goal?",
        },
      ]);
      
      toast({ 
        title: "Connection issue", 
        description: "Please try again.",
        variant: "destructive" 
      });
    }
  };

  const handleAIState = (aiResponse: AIStateResponse) => {
    const { status, intel } = aiResponse.state_analysis;
    
    console.log("🎯 AI State:", status, "Intel:", intel);

    switch (status) {
      case "needs_modality":
        // Show project vs checklist choice buttons
        setShowChoices(true);
        break;
        
      case "needs_deadline":
        // This would typically show a date picker, but let's keep it simple for now
        // The AI will naturally ask for the date and user can type it
        break;
        
      case "needs_commitment":
        // Show commitment UI for projects
        if (intel.modality === "project") {
          // We could show a commitment UI here, but for simplicity, let AI handle it
        }
        break;
        
      case "ready_to_generate":
        // Show handoff confirmation
        handleReadyToGenerate(intel);
        break;
        
      default:
        // Continue normal conversation
        break;
    }
  };

  const handleReadyToGenerate = (intel: any) => {
    console.log("🎯 Ready to generate plan with intel:", intel);
    
    // Convert AI intel to our Intel format
    const finalIntel: Intel = {
      title: intel.title || "Untitled Goal",
      modality: intel.modality || "project",
      deadline: intel.deadline,
      context: intel.context || ""
    };
    
    // Create user constraints with defaults
    const finalConstraints: UserConstraints = {
      deadline: intel.deadline,
      hoursPerWeek: intel.modality === "project" ? 10 : 0, // Default hours
      dailyBudget: intel.modality === "project" ? createDefaultDailyBudget(2) : undefined
    };
    
    setHandoffData({
      intel: finalIntel,
      userConstraints: finalConstraints
    });
    setShowHandoff(true);
  };

  const handleConfirmPlan = async (updatedIntel: Intel, updatedConstraints: UserConstraints) => {
    setIsGeneratingPlan(true);
    
    try {
      // Navigate to plan review with the confirmed intel data
      navigate("/plan-review", { 
        state: { 
          intel: updatedIntel,
          userConstraints: updatedConstraints 
        } 
      });
    } catch (error) {
      console.error("❌ Error navigating to plan review:", error);
      setIsGeneratingPlan(false);
      toast({ 
        title: "Navigation error", 
        description: "Please try again.",
        variant: "destructive" 
      });
    }
  };

  const handleChoice = (choiceId: string) => {
    console.log("🎯 User choice:", choiceId);
    setShowChoices(false);
    
    // Send choice back to AI
    const choiceText = choiceId === "project" 
      ? "I'd like to set a specific deadline for this goal."
      : "This is more of an ongoing goal without a specific deadline.";
    
    handleSend(choiceText);
  };

  const handleStartOver = () => {
    setShowHandoff(false);
    setShowChoices(false);
    setCurrentAIState(null);
    setHandoffData(null);
    setMessages([
      {
        role: "assistant",
        content: "Hey! I'm Viluuma, your friendly AI coach. What awesome goal is on your mind? 🎯",
      },
    ]);
    setUserInput("");
    setIsAITyping(false);
    inputRef.current?.focus();
  };

  return (
    <main className="mx-auto max-w-screen-sm p-4 pb-24">
      <h1 className="sr-only">AI Goal Onboarding</h1>
      
      {/* Chat Messages */}
      <div className="space-y-3 mb-4">
        {messages.map((message, index) => (
          <ChatMessage 
            key={index} 
            role={message.role} 
            content={message.content} 
          />
        ))}
        {isAITyping && <TypingIndicator />}
      </div>

      {/* Choice Buttons for Project vs Checklist */}
      {showChoices && currentAIState?.state_analysis.status === "needs_modality" && (
        <div className="mb-4">
          <ChoiceButtons
            title="What type of goal is this?"
            choices={[
              {
                id: "project",
                label: "Set a deadline",
                description: "I want to complete this by a specific date",
                icon: "📅",
                variant: "outline"
              },
              {
                id: "checklist",
                label: "Ongoing goal",
                description: "This is something I want to work on regularly",
                icon: "📋", 
                variant: "outline"
              }
            ]}
            onChoice={handleChoice}
          />
        </div>
      )}

      {/* Handoff Confirmation */}
      {showHandoff && handoffData && (
        <div className="fixed inset-x-0 bottom-0">
          <HandoffConfirmation
            intel={handoffData.intel}
            userConstraints={handoffData.userConstraints}
            onConfirm={handleConfirmPlan}
            onStartOver={handleStartOver}
            isLoading={isGeneratingPlan}
          />
        </div>
      )}

      {/* Input Area - Only show if not in any modal mode */}
      {!showHandoff && (
        <Card className="fixed inset-x-0 bottom-0 mx-auto max-w-screen-sm border-t">
          <CardContent className="flex items-center gap-2 p-3">
            <Input
              ref={inputRef}
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              placeholder="Type your message..."
              disabled={isAITyping}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              className="flex-1"
            />
            <Button 
              onClick={() => handleSend()} 
              disabled={!userInput.trim() || isAITyping}
              size="sm"
            >
              Send
            </Button>
          </CardContent>
        </Card>
      )}
    </main>
  );
};

export default AIOnboardingWizard;