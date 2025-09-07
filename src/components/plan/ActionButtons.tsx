import { Button } from "@/components/ui/button";

const ActionButtons = ({
  status,
  message,
  recomputing,
  saving,
  onCompress,
  onExtend,
  onRegenerate,
  onSave,
}: {
  status: "success" | "under_scoped" | "over_scoped" | "low_quality";
  message?: string;
  recomputing: boolean;
  saving: boolean;
  onCompress: () => void;
  onExtend: () => void;
  onRegenerate: () => void;
  onSave: () => void;
}) => {
  return (
    <div className="fixed inset-x-0 bottom-0 mx-auto max-w-screen-md border-t bg-background/80 p-3">
      <div className="flex items-center justify-between gap-3">
        {message ? (
          <p className="text-xs text-muted-foreground line-clamp-2" aria-live="polite">{message}</p>
        ) : (
          <span className="sr-only">Plan actions</span>
        )}
        <div className="flex items-center justify-end gap-2">
          {status === "over_scoped" && (
            <>
              <Button variant="secondary" disabled={recomputing} onClick={onExtend}>
                Extend Deadline
              </Button>
              <Button disabled={recomputing} onClick={onCompress}>
                Compress Plan
              </Button>
            </>
          )}

          {status === "under_scoped" && (
            <>
              <Button disabled={recomputing} onClick={onExtend}>
                Make it More Ambitious
              </Button>
              <Button variant="secondary" disabled={saving} onClick={onSave}>
                Keep This Relaxed Pace
              </Button>
            </>
          )}

          {status === "low_quality" && (
            <Button disabled={recomputing} onClick={onRegenerate}>
              Let's Try Again
            </Button>
          )}

          {status === "success" && (
            <>
              <Button variant="secondary" disabled={recomputing} onClick={onRegenerate}>
                Regenerate Plan
              </Button>
              <Button disabled={saving} onClick={onSave}>
                {saving ? "Saving..." : "✅ Let's Do This!"}
              </Button>
            </>
          )}

          {status !== "success" && status !== "under_scoped" && status !== "low_quality" && (
            <Button disabled={saving} onClick={onSave}>
              {saving ? "Saving..." : "✅ Let's Do This!"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ActionButtons;
