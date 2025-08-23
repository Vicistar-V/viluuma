import { cn } from "@/lib/utils";
import { StreamingTextRenderer } from "./StreamingTextRenderer";

interface ChatMessageProps {
  role: "user" | "assistant";
  content?: string;
  textChunks?: string[];
  isStreaming?: boolean;
}

const ChatMessage = ({ role, content, textChunks, isStreaming = false }: ChatMessageProps) => {
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
        {textChunks && textChunks.length > 0 ? (
          <StreamingTextRenderer chunks={textChunks} />
        ) : (
          <span>
            {content}
            {isStreaming && <span className="inline-block w-2 h-4 ml-1 bg-current animate-pulse">|</span>}
          </span>
        )}
      </div>
    </div>
  );
};

export default ChatMessage;
