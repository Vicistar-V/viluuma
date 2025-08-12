import { Button } from "@/components/ui/button";

interface ProjectActionFooterProps {
  blueprint: {
    status: "success" | "under_scoped" | "over_scoped" | "low_quality" | "success_checklist";
    message: string;
    calculatedEndDate?: string;
    plan: {
      milestones: { title: string; order_index: number }[];
      scheduledTasks: {
        id: string;
        title: string;
        description: string | null;
        milestone_index: number;
        duration_hours: number;
        priority: "low" | "medium" | "high" | null;
        start_day_offset: number;
        end_day_offset: number;
      }[];
      hoursPerWeek: number;
      dailyBudget: number;
    };
  };
  intel: {
    title: string;
    modality: "project" | "checklist";
    context?: string;
    levelOfDetail?: "condensed" | "standard" | "comprehensive";
  };
  userConstraints?: {
    deadline: string | null;
    hoursPerWeek?: number;
  };
  recomputing: boolean;
  saving: boolean;
  onAction: (action: {
    type: 'SAVE' | 'REGENERATE' | 'ACCEPT_AND_SAVE';
    plan?: any;
    newDeadline?: string;
    options?: { compression_requested?: boolean; expansion_requested?: boolean };
  }) => void;
}

const ProjectActionFooter = ({ blueprint, intel, userConstraints, recomputing, saving, onAction }: ProjectActionFooterProps) => {
  const { status, calculatedEndDate } = blueprint;
  
  // Generate scenario-specific messages and button configurations for projects
  const getProjectScenarioConfig = () => {
    switch (status) {
      case 'success':
      case 'success_checklist': // Handle checklist success as regular success for projects
        return {
          message: "✅ Your personalized plan is ready! This looks like a solid roadmap to success.",
          buttons: [
            {
              variant: "secondary" as const,
              label: "🔄 Regenerate Plan",
              action: () => onAction({ type: 'REGENERATE' }),
              disabled: recomputing
            },
            {
              variant: "default" as const,
              label: saving ? "Saving..." : "✅ Let's Do This!",
              action: () => onAction({ type: 'SAVE', plan: blueprint.plan }),
              disabled: saving,
              primary: true
            }
          ]
        };

      case 'over_scoped':
        const userDeadline = userConstraints?.deadline ? new Date(userConstraints.deadline).toLocaleDateString() : "your deadline";
        const calcEnd = calculatedEndDate ? new Date(calculatedEndDate).toLocaleDateString() : "later than expected";
        return {
          message: `⚠️ Heads up! This plan is ambitious and might go past your deadline of ${userDeadline}. The calculated end date is ${calcEnd}.`,
          buttons: [
            {
              variant: "default" as const,
              label: "✂️ Compress Plan",
              action: () => onAction({ type: 'REGENERATE', options: { compression_requested: true } }),
              disabled: recomputing
            },
            {
              variant: "default" as const,
              label: "🗓️ Extend Deadline",
              action: () => onAction({ 
                type: 'ACCEPT_AND_SAVE', 
                plan: blueprint.plan, 
                newDeadline: calculatedEndDate 
              }),
              disabled: saving
            }
          ]
        };

      case 'under_scoped':
        const underEnd = calculatedEndDate ? new Date(calculatedEndDate).toLocaleDateString() : "much earlier";
        return {
          message: `🚀 Great news! This plan should be done way ahead of your deadline, around ${underEnd}. What's our next move?`,
          buttons: [
            {
              variant: "default" as const,
              label: "💪 Make it More Ambitious",
              action: () => onAction({ type: 'REGENERATE', options: { expansion_requested: true } }),
              disabled: recomputing,
              primary: true
            },
            {
              variant: "secondary" as const,
              label: "✅ Keep This Relaxed Pace",
              action: () => onAction({ type: 'SAVE', plan: blueprint.plan }),
              disabled: saving
            }
          ]
        };

      case 'low_quality':
        return {
          message: "🤔 Hmm, that first attempt wasn't great. The plan the AI generated seems a bit too simple for a goal like this.",
          buttons: [
            {
              variant: "default" as const,
              label: "🔄 Let's Try Again",
              action: () => onAction({ type: 'REGENERATE' }),
              disabled: recomputing,
              primary: true
            }
          ]
        };

      default:
        return {
          message: blueprint.message || "Plan ready for review.",
          buttons: [
            {
              variant: "default" as const,
              label: saving ? "Saving..." : "✅ Let's Do This!",
              action: () => onAction({ type: 'SAVE', plan: blueprint.plan }),
              disabled: saving,
              primary: true
            }
          ]
        };
    }
  };

  const config = getProjectScenarioConfig();

  return (
    <div className="fixed inset-x-0 bottom-0 mx-auto max-w-screen-md border-t bg-background/80 backdrop-blur">
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

export default ProjectActionFooter;