import { Button } from "@/components/ui/button";

const ActionButtons = ({
  status,
  recomputing,
  saving,
  onCompress,
  onExtend,
  onSave,
}: {
  status: "success" | "under_scoped" | "over_scoped" | "low_quality";
  recomputing: boolean;
  saving: boolean;
  onCompress: () => void;
  onExtend: () => void;
  onSave: () => void;
}) => {
  return (
    <div className="fixed inset-x-0 bottom-0 mx-auto max-w-screen-md border-t bg-background/80 p-3 backdrop-blur">
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
          <Button disabled={recomputing} onClick={onExtend}>
            Expand Plan
          </Button>
        )}
        {status === "low_quality" && (
          <Button disabled={recomputing} onClick={onExtend}>
            Improve Plan
          </Button>
        )}
        <Button disabled={saving} onClick={onSave}>
          {saving ? "Saving..." : "✅ Let's Do This!"}
        </Button>
      </div>
    </div>
  );
};

export default ActionButtons;
