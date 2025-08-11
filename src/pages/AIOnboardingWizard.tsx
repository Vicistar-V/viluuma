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
      content:
        "Hey! I'm Viluuma, your friendly AI coach. Tell me what awesome goal is on your mind!",
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
    if (!trimmed) return;

    const newUserMessage: ChatMessageType = { role: "user", content: trimmed };
    const outbound = [...messages, newUserMessage];
    setMessages(outbound);
    setUserInput("");
    setIsAITyping(true);

    try {
      const { data, error } = await supabase.functions.invoke("onboard-goal", {
        body: { messages: outbound },
      });
      if (error) throw error;

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
            placeholder="Type your reply..."
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSend();
            }}
          />
          <Button onClick={handleSend} disabled={!userInput.trim()}>
            Send
          </Button>
        </CardContent>
      </Card>
    </main>
  );
};

export default AIOnboardingWizard;
