const ErrorMessage = ({ message }: { message: string }) => {
  return (
    <main className="flex min-h-[50vh] flex-col items-center justify-center p-8 text-center">
      <p className="text-sm text-destructive">{message}</p>
    </main>
  );
};
export default ErrorMessage;
