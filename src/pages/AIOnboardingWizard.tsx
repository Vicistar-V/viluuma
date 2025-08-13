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

const AIOnboardingWizard = () => {
  const [messages, setMessages] = useState<ChatMessageType[]>([
    {
      role: "assistant",
      content: "Hey! I'm Viluuma, your friendly AI coach. What awesome goal is on your mind? 🎯",
    },
  ]);
  const [userInput, setUserInput] = useState("");
  const [isAITyping, setIsAITyping] = useState(false);
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
        body: { conversationHistory: updatedMessages },
      });
      
      if (error) {
        console.error("❌ Supabase function error:", error);
        throw error;
      }

      console.log("📥 Received response:", data);

      // Check for handoff to plan generation
      if (data?.status === "ready_to_generate" && data?.intel) {
        console.log("🎯 Handoff detected, navigating to plan review");
        
        setIsAITyping(false);
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: "Perfect! I've got everything I need. Let me work my magic and create your plan... ✨",
          },
        ]);
        
        // Navigate to plan review with intel data
        setTimeout(() => {
          navigate("/plan-review", { 
            state: { 
              intel: data.intel,
              userConstraints: data.userConstraints 
            } 
          });
        }, 1500);
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

      {/* Input Area */}
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
    </main>
  );
};

export default AIOnboardingWizard;