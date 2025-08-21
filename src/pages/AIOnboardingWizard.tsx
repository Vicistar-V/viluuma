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

interface ChatMessageType {
  role: "user" | "assistant";
  content: string;
}

interface Intel {
  title: string;
  modality: "project" | "checklist";
  deadline?: string | null;
  context: string;
}

interface DailyBudget {
  mon: number;
  tue: number;
  wed: number;
  thu: number;
  fri: number;
  sat: number;
  sun: number;
}

interface CommitmentData {
  type: "daily" | "weekly";
  dailyBudget: DailyBudget;
  totalHoursPerWeek: number;
}

interface UserConstraints {
  deadline?: string | null;
  hoursPerWeek: number;
  dailyBudget?: DailyBudget;
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
  const [showHandoff, setShowHandoff] = useState(false);
  const [showCommitmentUI, setShowCommitmentUI] = useState(false);
  const [pendingIntel, setPendingIntel] = useState<Intel | null>(null);
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

      // Check for commitment UI trigger
      if (data?.status === "commitment_needed") {
        console.log("⏰ Commitment gathering needed, showing commitment UI");
        
        setIsAITyping(false);
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: "Perfect! Last question to make this plan super realistic for you: roughly how many hours per day do you think you can put towards this?",
          },
        ]);
        
        // Extract intel from conversation history for commitment phase
        const conversationIntel = extractIntelFromConversation(updatedMessages);
        setPendingIntel(conversationIntel);
        setShowCommitmentUI(true);
        return;
      }

      // Check for final handoff to plan generation
      if (data?.status === "ready_to_generate" && data?.intel) {
        console.log("🎯 Final handoff detected, showing confirmation UI");
        
        setIsAITyping(false);
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: "Okay, I think I've got a great starting point! Here's the briefing I've put together. Does this look right to you?",
          },
        ]);
        
        // Show the handoff confirmation UI
        setHandoffData({
          intel: data.intel,
          userConstraints: data.userConstraints
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
      } else {
        console.warn("⚠️ Unexpected response format:", data);
        setIsAITyping(false);
        toast({ 
          title: "Unexpected response format", 
          description: "Please try again.",
          variant: "destructive" 
        });
      }

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

  // Extract intel from conversation for commitment phase
  const extractIntelFromConversation = (messages: ChatMessageType[]): Intel => {
    // Simple extraction logic - in a real implementation, this could be more sophisticated
    const userMessages = messages.filter(m => m.role === 'user').map(m => m.content).join(' ');
    
    // Basic heuristics to extract goal info from conversation
    const title = userMessages.length > 10 ? userMessages.substring(0, 100) + '...' : userMessages;
    const modality = userMessages.toLowerCase().includes('deadline') || 
                    userMessages.toLowerCase().includes('by ') ? 'project' : 'checklist';
    
    return {
      title: title || 'My Goal',
      modality: modality as 'project' | 'checklist',
      context: userMessages
    };
  };

  const handleCommitmentSet = (commitment: CommitmentData) => {
    if (!pendingIntel) return;
    
    console.log("⏰ Commitment set:", commitment);
    
    // Create final intel and constraints with commitment data
    const finalIntel: Intel = pendingIntel;
    const finalConstraints: UserConstraints = {
      deadline: null, // Will be extracted from conversation if needed
      hoursPerWeek: commitment.totalHoursPerWeek,
      dailyBudget: commitment.dailyBudget
    };
    
    // Hide commitment UI and show handoff confirmation
    setShowCommitmentUI(false);
    setMessages((prev) => [
      ...prev,
      {
        role: "assistant",
        content: "Awesome! I've got everything I need. Here's the briefing I've put together. Does this look right to you?",
      },
    ]);
    
    setHandoffData({
      intel: finalIntel,
      userConstraints: finalConstraints
    });
    setShowHandoff(true);
  };

  const handleStartOver = () => {
    setShowHandoff(false);
    setShowCommitmentUI(false);
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

      {/* Input Area - Only show if not in handoff or commitment mode */}
      {!showHandoff && !showCommitmentUI && (
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