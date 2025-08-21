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
    commitment: string | null;
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
  const [currentAIState, setCurrentAIState] = useState<AIStateResponse | null>(null);
  const [showHandoff, setShowHandoff] = useState(false);
  const [showChoices, setShowChoices] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showCommitmentUI, setShowCommitmentUI] = useState(false);
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
    setShowDatePicker(false);
    setShowCommitmentUI(false);

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
        { role: "assistant", content: data.say_to_user }
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

  const handleDateSelect = (date: Date | null) => {
    console.log("🗓️ Date selected:", date);
    setShowDatePicker(false);
    
    const dateMessage = date 
      ? `My target date is ${format(date, "MMMM d, yyyy")}.`
      : "I don't have a specific deadline in mind.";
    
    handleSend(dateMessage);
  };

  const handleDatePickerCancel = () => {
    setShowDatePicker(false);
  };

  const handleCommitmentSet = (commitment: CommitmentData) => {
    console.log("⏰ Commitment set:", commitment);
    setShowCommitmentUI(false);
    
    const commitmentMessage = `I can commit ${commitment.totalHoursPerWeek} hours per week to this goal.`;
    handleSend(commitmentMessage);
  };

  const handleStartOver = () => {
    setShowHandoff(false);
    setShowChoices(false);
    setShowDatePicker(false);
    setShowCommitmentUI(false);
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