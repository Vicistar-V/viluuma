import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
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
import { useStreamingAI } from "@/hooks/useStreamingAI";
import { useStreamingParser } from "@/hooks/useStreamingParser";
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
  say_to_user: string;
  next_action: "WAIT_FOR_TEXT_INPUT" | "SHOW_MODALITY_CHOICE" | "SHOW_CALENDAR_PICKER" | "SHOW_COMMITMENT_SLIDER" | "FINALIZE_AND_HANDOFF";
  intel?: {
    title: string;
    modality: "project" | "checklist";
    deadline: string | null;
    commitment: {
      totalHoursPerWeek: number;
      dailyBudget: DailyBudget;
    } | null;
    context: string;
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
  
  // Initialize streaming parser
  const streamingParser = useStreamingParser();
  const [currentAIState, setCurrentAIState] = useState<AIStateResponse | null>(null);
  const [showHandoff, setShowHandoff] = useState(false);
  const [showChoices, setShowChoices] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showCommitmentUI, setShowCommitmentUI] = useState(false);
  const [handoffData, setHandoffData] = useState<{intel: Intel, userConstraints: UserConstraints} | null>(null);
  const [storedCommitmentData, setStoredCommitmentData] = useState<CommitmentData | null>(null);
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement | null>(null);

  const handleAIResponse = (response: AIStateResponse) => {
    // Add final AI response to messages
    setMessages((prev) => [
      ...prev, 
      { role: "assistant", content: response.say_to_user }
    ]);
    
    // Set the AI state for further processing
    setCurrentAIState(response);
    handleAIState(response);
  };

  const { sendMessage: sendStreamingMessage, isStreaming } = useStreamingAI({
    onStreamingStart: () => {
      console.log("🌊 Streaming started");
      setIsAITyping(true);
      streamingParser.reset();
    },
    onStreamingDelta: (delta: string, accumulated: string) => {
      console.log("📝 Streaming delta:", { delta, accumulated });
      streamingParser.processRawChunk(delta, accumulated);
    },
    onStreamingComplete: (response) => {
      console.log("✅ Streaming complete:", response);
      streamingParser.markComplete();
      
      // Add the complete message to messages after streaming is done
      setTimeout(() => {
        handleAIResponse(response);
        setIsAITyping(false);
      }, 500); // Small delay to let the streaming animation finish
    },
    onStreamingError: (error) => {
      console.error("❌ Streaming error:", error);
      setIsAITyping(false);
      streamingParser.reset();
      
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
  });

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSend = async (userMessage?: string) => {
    const message = userMessage || userInput.trim();
    if (!message || isAITyping || isStreaming) return;

    // Add user message to conversation
    const newUserMessage: ChatMessageType = { role: "user", content: message };
    const updatedMessages = [...messages, newUserMessage];
    setMessages(updatedMessages);
    setUserInput("");

    // Hide any UI elements
    setShowChoices(false);
    setShowDatePicker(false);
    setShowCommitmentUI(false);

    // Send streaming message
    await sendStreamingMessage(
      updatedMessages,
      Intl.DateTimeFormat().resolvedOptions().timeZone
    );
  };

  const handleAIState = (aiResponse: AIStateResponse) => {
    console.log("🎯 AI Response:", aiResponse);

    // Handle the new next_action based system
    switch (aiResponse.next_action) {
      case "WAIT_FOR_TEXT_INPUT":
        // Continue normal conversation - no special UI needed
        break;
        
      case "SHOW_MODALITY_CHOICE":
        setShowChoices(true);
        break;
        
      case "SHOW_CALENDAR_PICKER":
        setShowDatePicker(true);
        break;
        
      case "SHOW_COMMITMENT_SLIDER":
        setShowCommitmentUI(true);
        break;
        
      case "FINALIZE_AND_HANDOFF":
        if (aiResponse.intel) {
          handleReadyToGenerate(aiResponse.intel);
        }
        break;
        
      default:
        console.warn("Unknown next_action:", aiResponse.next_action);
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
    
    // Use commitment data directly from AI intel
    const finalConstraints: UserConstraints = {
      deadline: intel.deadline,
      hoursPerWeek: intel.commitment?.totalHoursPerWeek || (intel.modality === "project" ? 10 : 0),
      dailyBudget: intel.commitment?.dailyBudget || (intel.modality === "project" ? createDefaultDailyBudget(2) : undefined)
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
    
    if (choiceId === "project") {
      // For project goals, immediately show date picker
      setShowDatePicker(true);
    } else {
      // For ongoing goals, send directly to AI
      const choiceText = "This is more of an ongoing goal without a specific deadline.";
      handleSend(choiceText);
    }
  };

  const handleDateSelect = (date: Date | null) => {
    console.log("🗓️ Date selected:", date);
    setShowDatePicker(false);
    
    // Send both modality and date info together
    const dateMessage = date 
      ? `I'd like to set a specific deadline for this goal. My target date is ${format(date, "MMMM d, yyyy")}.`
      : "I don't have a specific deadline in mind.";
    
    handleSend(dateMessage);
  };

  const handleDatePickerCancel = () => {
    setShowDatePicker(false);
  };

  const handleCommitmentSet = (commitment: CommitmentData) => {
    console.log("⏰ Commitment set:", commitment);
    setStoredCommitmentData(commitment); // Store the actual commitment data FIRST
    setShowCommitmentUI(false);
    
    // Send the commitment details including daily breakdown
    const dailyBreakdown = Object.entries(commitment.dailyBudget)
      .filter(([_, hours]) => hours > 0)
      .map(([day, hours]) => `${day}: ${hours}hrs`)
      .join(', ');
    
    const commitmentMessage = `I can commit ${commitment.totalHoursPerWeek} hours per week (${dailyBreakdown}) to this goal.`;
    handleSend(commitmentMessage);
  };

  const handleStartOver = () => {
    setShowHandoff(false);
    setShowChoices(false);
    setShowDatePicker(false);
    setShowCommitmentUI(false);
    setCurrentAIState(null);
    setHandoffData(null);
    setStoredCommitmentData(null); // Clear stored commitment data
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
        {/* Show streaming message while typing */}
        {isAITyping && streamingParser.textChunks.length > 0 && (
          <ChatMessage 
            role="assistant" 
            textChunks={streamingParser.textChunks}
            isStreaming={true}
          />
        )}
        {isAITyping && streamingParser.textChunks.length === 0 && <TypingIndicator />}
      </div>

      {/* Choice Buttons for Project vs Checklist */}
      {showChoices && (
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

      {/* Date Picker for Deadline */}
      {showDatePicker && (
        <div className="mb-4">
          <DatePickerInChat
            onDateSelect={handleDateSelect}
            onCancel={handleDatePickerCancel}
            openDirectly={true}
          />
        </div>
      )}

      {/* Commitment UI for Projects */}
      {showCommitmentUI && (
        <div className="mb-4">
          <CommitmentProfileUI
            onCommitmentSet={handleCommitmentSet}
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
      {!showHandoff && !showDatePicker && !showCommitmentUI && (
        <Card className="fixed inset-x-0 bottom-0 mx-auto max-w-screen-sm border-t">
          <CardContent className="flex items-center gap-2 p-3">
            <Input
              ref={inputRef}
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              placeholder="Type your message..."
              disabled={isAITyping || isStreaming}
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
              disabled={!userInput.trim() || isAITyping || isStreaming}
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