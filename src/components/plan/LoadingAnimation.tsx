const LoadingAnimation = ({ label = "Loading..." }: { label?: string }) => {
  return (
    <main className="flex min-h-[60vh] flex-col items-center justify-center p-8 text-center">
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" aria-hidden />
      <p className="mt-4 text-sm text-muted-foreground" aria-live="polite">{label}</p>
    </main>
  );
};
export default LoadingAnimation;
