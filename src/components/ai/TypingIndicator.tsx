const TypingIndicator = () => {
  return (
    <div className="flex justify-start">
      <div className="inline-flex items-center gap-1 rounded-full bg-accent/60 px-3 py-1 text-xs text-accent-foreground">
        <span className="inline-block h-1 w-1 animate-bounce rounded-full bg-foreground [animation-delay:-0.3s]"></span>
        <span className="inline-block h-1 w-1 animate-bounce rounded-full bg-foreground [animation-delay:-0.15s]"></span>
        <span className="inline-block h-1 w-1 animate-bounce rounded-full bg-foreground"></span>
      </div>
    </div>
  );
};

export default TypingIndicator;
