import { Button } from "@/components/ui/button";

interface ChecklistActionFooterProps {
  blueprint: {
    status: "success_checklist" | "low_quality";
    message: string;
    plan: {
      milestones: { title: string; order_index: number }[];
      scheduledTasks: {
        id: string;
        title: string;
        description: string | null;
        milestone_index: number;
        duration_hours: number;
        priority: "low" | "medium" | "high" | null;
      }[];
    };
  };
  intel: {
    title: string;
    modality: "project" | "checklist";
    context?: string;
    levelOfDetail?: "condensed" | "standard" | "comprehensive";
  };
  recomputing: boolean;
  saving: boolean;
  onAction: (action: {
    type: 'SAVE' | 'REGENERATE';
    plan?: any;
  }) => void;
}

const ChecklistActionFooter = ({ blueprint, intel, recomputing, saving, onAction }: ChecklistActionFooterProps) => {
  const { status } = blueprint;
  
  // Generate scenario-specific messages and button configurations for checklists
  const getChecklistScenarioConfig = () => {
    switch (status) {
      case 'success_checklist':
        return {
          message: "✅ Here's your checklist! Does this look like a good starting point?",
          buttons: [
            {
              variant: "secondary" as const,
              label: "🔄 Try Again",
              action: () => onAction({ type: 'REGENERATE' }),
              disabled: recomputing
            },
            {
              variant: "default" as const,
              label: saving ? "Saving..." : "Looks Good, Save Checklist",
              action: () => onAction({ type: 'SAVE', plan: blueprint.plan }),
              disabled: saving,
              primary: true
            }
          ]
        };

      case 'low_quality':
        return {
          message: "🤔 Hmm, that seems a bit too simple for a goal like this.",
          buttons: [
            {
              variant: "default" as const,
              label: recomputing ? "Regenerating..." : "🔄 Regenerate Checklist",
              action: () => onAction({ type: 'REGENERATE' }),
              disabled: recomputing,
              primary: true
            }
          ]
        };

      default:
        return {
          message: "Checklist ready for review.",
          buttons: [
            {
              variant: "default" as const,
              label: saving ? "Saving..." : "Save Checklist",
              action: () => onAction({ type: 'SAVE', plan: blueprint.plan }),
              disabled: saving,
              primary: true
            }
          ]
        };
    }
  };

  const config = getChecklistScenarioConfig();

  return (
    <div className="fixed inset-x-0 bottom-0 mx-auto max-w-screen-md border-t bg-background/80">
      {/* Message Area */}
      <div className="px-4 py-3 border-b border-border/50">
        <p 
          className="text-sm text-foreground leading-relaxed" 
          aria-live="polite"
        >
          {config.message}
        </p>
      </div>
      
      {/* Button Area */}
      <div className="p-4">
        <div className="flex items-center justify-end gap-3">
          {config.buttons.map((button, index) => (
            <Button
              key={index}
              variant={button.variant}
              onClick={button.action}
              disabled={button.disabled}
              className={button.primary ? "min-w-[140px]" : ""}
            >
              {button.label}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ChecklistActionFooter;