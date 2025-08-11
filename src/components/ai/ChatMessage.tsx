import { cn } from "@/lib/utils";

const ChatMessage = ({ role, content }: { role: "user" | "assistant"; content: string }) => {
  const isUser = role === "user";
  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>      
      <div
        className={cn(
          "max-w-[85%] rounded-lg px-3 py-2 text-sm shadow-sm",
          isUser ? "bg-primary text-primary-foreground" : "bg-accent text-accent-foreground"
        )}
        aria-label={isUser ? "Your message" : "Assistant message"}
      >
        {content}
      </div>
    </div>
  );
};

export default ChatMessage;
