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
import { 
  ChatMessageType, 
  Intel, 
  DailyBudget, 
  CommitmentData, 
  UserConstraints,
  extractDeadlineFromConversation,
  extractGoalFromConversation,
  determineModalityFromConversation,
  createDefaultDailyBudget
} from "@/types/onboarding";

const AIOnboardingWizard = () => {
  const [messages, setMessages] = useState<ChatMessageType[]>([
    {
      role: "assistant",
      content: "Hey! I'm Viluuma, your friendly AI coach. What awesome goal is on your mind? 🎯",
    },
  ]);
  const [userInput, setUserInput] = useState("");
  const [isAITyping, setIsAITyping] = useState(false);
  const [showHandoff, setShowHandoff] = useState(false);
  const [showCommitmentUI, setShowCommitmentUI] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [pendingIntel, setPendingIntel] = useState<(Intel & { dailyBudget: DailyBudget }) | null>(null);
  const [handoffData, setHandoffData] = useState<{intel: Intel, userConstraints: UserConstraints} | null>(null);
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSend = async () => {
    const trimmed = userInput.trim();
    if (!trimmed || isAITyping) return;

    // Add user message to conversation
    const newUserMessage: ChatMessageType = { role: "user", content: trimmed };
    const updatedMessages = [...messages, newUserMessage];
    setMessages(updatedMessages);
    setUserInput("");
    setIsAITyping(true);

    try {
      console.log("📤 Sending conversation to onboard-goal function");
      
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

      console.log("📥 Received response:", data);

      // Check for final handoff to plan generation  
      if (data?.status === "ready_to_generate" && data?.intel) {
        console.log("🎯 Complete handoff detected - showing handoff confirmation");
        
        // Create final constraints from pending intel or defaults
        const finalIntel: Intel = data.intel;
        const finalConstraints: UserConstraints = {
          deadline: finalIntel.deadline,
          hoursPerWeek: pendingIntel ? calculateWeeklyHours(pendingIntel.dailyBudget) : (finalIntel.modality === "project" ? 10 : 0),
          dailyBudget: pendingIntel ? pendingIntel.dailyBudget : (finalIntel.modality === "project" ? createDefaultDailyBudget(2) : undefined)
        };
        
        // Show handoff confirmation modal
        setIsAITyping(false);
        setHandoffData({
          intel: finalIntel,
          userConstraints: finalConstraints
        });
        setShowHandoff(true);
        return;
      }

      // Handle date picker request from AI
      if (data?.status === "date_picker_needed" && data?.message) {
        console.log("📅 AI requesting date picker, showing date picker UI");
        setIsAITyping(false);
        
        // Add the AI's timeline question to messages
        setMessages((prev) => [
          ...prev, 
          { role: "assistant", content: data.message }
        ]);
        
        // Extract intel from conversation for date picker phase
        const conversationIntel = extractIntelFromConversation(updatedMessages);
        setPendingIntel(conversationIntel);
        setShowDatePicker(true);
        return;
      }

      // Handle commitment request from AI (for projects only)
      if (data?.status === "commitment_needed" && data?.message) {
        console.log("⏰ AI requesting commitment, showing commitment UI");
        setIsAITyping(false);
        
        // Add the AI's commitment question to messages
        setMessages((prev) => [
          ...prev, 
          { role: "assistant", content: data.message }
        ]);
        
        // Extract existing intel or use conversation data
        if (!pendingIntel) {
          const conversationIntel = extractIntelFromConversation(updatedMessages);
          setPendingIntel(conversationIntel);
        }
        setShowCommitmentUI(true);
        return;
      }

      // Handle normal conversation response
      if (data?.content) {
        setIsAITyping(false);
        setMessages((prev) => [
          ...prev, 
          { role: "assistant", content: data.content }
        ]);
        return;
      }

      // If no content or unexpected format
      console.warn("⚠️ Unexpected response format:", data);
      setIsAITyping(false);
      toast({ 
        title: "Unexpected response format", 
        description: "Please try again.",
        variant: "destructive" 
      });

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

  // Enhanced intel extraction that preserves commitment data
  const extractIntelFromConversation = (messages: ChatMessageType[]): Intel & { dailyBudget: DailyBudget } => {
    const { title, context } = extractGoalFromConversation(messages);
    const deadline = extractDeadlineFromConversation(messages);
    const modality = determineModalityFromConversation(messages);
    
    return {
      title,
      modality,
      deadline,
      context,
      dailyBudget: createDefaultDailyBudget(2) // Default commitment
    };
  };

  // Helper to calculate weekly hours from daily budget
  const calculateWeeklyHours = (dailyBudget: DailyBudget): number => {
    return Object.values(dailyBudget).reduce((sum, hours) => sum + hours, 0);
  };

  const handleCommitmentSet = (commitment: CommitmentData) => {
    if (!pendingIntel) return;
    
    console.log("⏰ Commitment set:", commitment);
    
    // Update pending intel with commitment data  
    const updatedIntel = {
      ...pendingIntel,
      dailyBudget: commitment.dailyBudget
    };
    setPendingIntel(updatedIntel);
    
    // Send commitment response back to conversation to continue natural flow
    const commitmentResponse = `Perfect! I can work with ${commitment.totalHoursPerWeek} hours per week. That's a great, realistic commitment!`;
    const newMessage: ChatMessageType = { role: "user", content: commitmentResponse };
    const updatedMessages = [...messages, newMessage];
    
    // Hide commitment UI and continue conversation
    setShowCommitmentUI(false);
    setMessages(updatedMessages);
    setUserInput("");
    setIsAITyping(true);

    // Continue the conversation with commitment info
    handleContinueConversation(updatedMessages);
  };

  const handleContinueConversation = async (updatedMessages: ChatMessageType[]) => {
    try {
      const { data, error } = await supabase.functions.invoke("onboard-goal", {
        body: { 
          conversationHistory: updatedMessages,
          userTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone
        },
      });
      
      if (error) throw error;

      // Check for final handoff after commitment
      if (data?.status === "ready_to_generate" && data?.intel) {
        console.log("🎯 Complete handoff detected after commitment");
        
        const finalIntel: Intel = data.intel;
        const finalConstraints: UserConstraints = {
          deadline: pendingIntel?.deadline || finalIntel.deadline,
          hoursPerWeek: pendingIntel ? calculateWeeklyHours(pendingIntel.dailyBudget) : 10,
          dailyBudget: pendingIntel ? pendingIntel.dailyBudget : createDefaultDailyBudget(2)
        };
        
        setIsAITyping(false);
        setHandoffData({
          intel: { ...finalIntel, ...pendingIntel },
          userConstraints: finalConstraints
        });
        setShowHandoff(true);
        return;
      }

      // Handle normal conversation response
      if (data?.content) {
        setIsAITyping(false);
        setMessages((prev) => [
          ...prev, 
          { role: "assistant", content: data.content }
        ]);
      }
    } catch (error: any) {
      console.error("❌ Error continuing conversation:", error);
      setIsAITyping(false);
      toast({ 
        title: "Connection issue", 
        description: "Please try again.",
        variant: "destructive" 
      });
    }
  };

  const handleDateSelect = (selectedDate: Date | null) => {
    if (!pendingIntel) return;
    
    console.log("📅 Date selected:", selectedDate);
    
    // Determine modality based on date selection
    const modality: "project" | "checklist" = selectedDate ? "project" : "checklist";
    const deadline = selectedDate ? selectedDate.toISOString() : null;
    
    // Update pending intel with date and modality
    const updatedIntel: Intel & { dailyBudget: DailyBudget } = {
      ...pendingIntel,
      modality,
      deadline
    };
    setPendingIntel(updatedIntel);
    
    // Create response message about the date choice
    const dateResponse = selectedDate 
      ? `Perfect! I'll aim for ${selectedDate.toLocaleDateString()}. That gives us a great timeline to work with!`
      : `Got it! This is an ongoing goal with no specific deadline. That's totally fine!`;
    
    const newMessage: ChatMessageType = { role: "user", content: dateResponse };
    const updatedMessages = [...messages, newMessage];
    
    // Hide date picker and continue conversation
    setShowDatePicker(false);
    setMessages(updatedMessages);
    setIsAITyping(true);
    
    // Continue the conversation with date info
    handleContinueConversation(updatedMessages);
  };

  const handleDatePickerCancel = () => {
    setShowDatePicker(false);
    // Don't clear pendingIntel, just return to conversation
  };

  const handleStartOver = () => {
    setShowHandoff(false);
    setShowCommitmentUI(false);
    setShowDatePicker(false);
    setHandoffData(null);
    setPendingIntel(null);
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

      {/* Date Picker UI */}
      {showDatePicker && (
        <div className="fixed inset-x-0 bottom-0 p-4 max-w-screen-sm mx-auto">
          <DatePickerInChat 
            onDateSelect={handleDateSelect}
            onCancel={handleDatePickerCancel}
          />
        </div>
      )}

      {/* Commitment UI */}
      {showCommitmentUI && (
        <div className="fixed inset-x-0 bottom-0 p-4 max-w-screen-sm mx-auto">
          <CommitmentProfileUI onCommitmentSet={handleCommitmentSet} />
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
      {!showHandoff && !showCommitmentUI && !showDatePicker && (
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
              onClick={handleSend} 
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