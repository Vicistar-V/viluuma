import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import LoadingAnimation from "@/components/plan/LoadingAnimation";
import ErrorMessage from "@/components/plan/ErrorMessage";
import PlanOutlineView from "@/components/plan/PlanOutlineView";
import ProjectActionFooter from "@/components/plan/ProjectActionFooter";
import ChecklistActionFooter from "@/components/plan/ChecklistActionFooter";
import { addBusinessDays } from "date-fns";
interface Intel {
  title: string;
  modality: "project" | "checklist";
  context?: string;
  levelOfDetail?: "condensed" | "standard" | "comprehensive";
}

interface DailyBudget {
  mon: number;
  tue: number;
  wed: number;
  thu: number;
  fri: number;
  sat: number;
  sun: number;
}

interface UserConstraints {
  deadline: string | null;
  hoursPerWeek?: number;
  dailyBudget?: DailyBudget;
}

interface ScheduledTask {
  id: string;
  title: string;
  description: string | null;
  milestone_index: number;
  duration_hours: number;
  priority: "low" | "medium" | "high" | null;
  start_day_offset: number;
  end_day_offset: number;
}

interface Blueprint {
  status: "success" | "under_scoped" | "over_scoped" | "low_quality" | "success_checklist";
  message: string;
  calculatedEndDate?: string;
  plan: {
    milestones: { title: string; order_index: number }[];
    scheduledTasks: ScheduledTask[];
    hoursPerWeek: number;
    dailyBudget: number;
  };
}

const PlanReviewScreen = () => {
  const { state } = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();

  const intel = (state?.intel || null) as Intel | null;
  const userConstraints = (state?.userConstraints || null) as UserConstraints | null;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [blueprint, setBlueprint] = useState<Blueprint | null>(null);
  const [recomputing, setRecomputing] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    console.log("PlanReviewScreen - Intel received:", intel);
    if (!intel) {
      console.log("No intel found, redirecting to /goals/new");
      navigate("/goals/new");
      return;
    }
    const run = async () => {
      try {
        setLoading(true);
        
        // Get user's timezone for accurate plan generation
        const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        
        console.log("Calling generate-plan with intel:", intel);
        console.log("Calling generate-plan with userConstraints:", userConstraints);
        console.log("Calling generate-plan with userTimezone:", userTimezone);
        
        const { data, error } = await supabase.functions.invoke("generate-plan", {
          body: { intel, userConstraints, userTimezone },
        });
        if (import.meta.env.DEV) console.log("Generate-plan response:", { data, error });
        if (error) throw error;
        setBlueprint(data as Blueprint);
        setError(null);
      } catch (e: any) {
        console.error("Generate-plan error:", e);
        setError(String(e?.message || e));
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [intel, navigate]);

  // Project-specific action handler
  const handleProjectAction = async (action: {
    type: 'SAVE' | 'REGENERATE' | 'ACCEPT_AND_SAVE';
    plan?: any;
    newDeadline?: string;
    options?: { compression_requested?: boolean; expansion_requested?: boolean };
  }) => {
    if (!intel) return;

    if (action.type === 'SAVE') {
      return handleProjectSave(action.plan);
    }

    if (action.type === 'ACCEPT_AND_SAVE') {
      return handleProjectSave(action.plan, action.newDeadline);
    }

    if (action.type === 'REGENERATE') {
      try {
        setRecomputing(true);
        
        // Get user's timezone for regeneration
        const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        
        const { data, error } = await supabase.functions.invoke("generate-plan", {
          body: { 
            intel, 
            userConstraints,
            userTimezone,
            compression_requested: !!action.options?.compression_requested,
            extension_requested: !!action.options?.expansion_requested 
          },
        });
        if (error) throw error;
        setBlueprint(data as Blueprint);
      } catch (e: any) {
        toast({ title: "Failed to regenerate", description: String(e?.message || e), variant: "destructive" });
      } finally {
        setRecomputing(false);
      }
    }
  };

  // Checklist-specific action handler
  const handleChecklistAction = async (action: {
    type: 'SAVE' | 'REGENERATE';
    plan?: any;
  }) => {
    if (!intel) return;

    if (action.type === 'SAVE') {
      return handleChecklistSave(action.plan);
    }

    if (action.type === 'REGENERATE') {
      try {
        setRecomputing(true);
        
        // Get user's timezone for regeneration
        const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        
        const { data, error } = await supabase.functions.invoke("generate-plan", {
          body: { intel, userConstraints, userTimezone },
        });
        if (error) throw error;
        setBlueprint(data as Blueprint);
      } catch (e: any) {
        toast({ title: "Failed to regenerate", description: String(e?.message || e), variant: "destructive" });
      } finally {
        setRecomputing(false);
      }
    }
  };

  // Project save with date anchoring - BLAZING FAST VERSION
  const handleProjectSave = async (plan?: any, newDeadline?: string) => {
    const planToSave = plan || blueprint?.plan;
    if (!intel || !planToSave) return;
    
    try {
      setSaving(true);
      // Get timezone-aware current date for anchoring
      const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const start = new Date(new Date().toLocaleDateString('en-CA', { timeZone: userTimezone }) + 'T00:00:00');
      // Prepare tasks with anchored dates on workdays
      const tasksWithDates = planToSave.scheduledTasks.map((t: any) => {
        const startDate = addBusinessDays(start, t.start_day_offset);
        const endDate = addBusinessDays(start, t.end_day_offset);
        return {
          title: t.title,
          description: t.description,
          duration_hours: t.duration_hours,
          start_date: startDate.toISOString().slice(0, 10),
          end_date: endDate.toISOString().slice(0, 10),
          milestone_index: t.milestone_index,
          priority: t.priority,
          is_anchored: false,
        };
      });

      // Create unified plan object for blazing-fast CTE-based save
      const unifiedPlan = {
        ...planToSave,
        scheduledTasks: tasksWithDates
      };

      // Use the new deadline if provided (for extended deadline scenarios)
      const targetDate = newDeadline || userConstraints?.deadline;

      const { data, error } = await supabase.rpc("save_goal_plan", {
        p_title: intel.title,
        p_modality: intel.modality,
        p_target_date: targetDate ?? null,
        p_milestones: unifiedPlan.milestones,
        p_tasks: unifiedPlan.scheduledTasks,
        p_description: intel.context || null,
      });

      if (error) throw error;
      const goalId = data as string;
      toast({ title: "Plan saved!" });
      navigate(`/goals/${goalId}`);
    } catch (e: any) {
      toast({ title: "Save failed", description: String(e?.message || e), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  // Checklist save without date anchoring - BLAZING FAST VERSION
  const handleChecklistSave = async (plan?: any) => {
    const planToSave = plan || blueprint?.plan;
    if (!intel || !planToSave) return;
    
    try {
      setSaving(true);

      // For checklists, prepare tasks without dates (no anchoring)
      const tasksWithoutDates = planToSave.scheduledTasks.map((t: any) => ({
        title: t.title,
        description: t.description,
        duration_hours: t.duration_hours,
        start_date: null, // No dates for checklists
        end_date: null,   // No dates for checklists
        milestone_index: t.milestone_index,
        priority: t.priority,
        is_anchored: false, // Not anchored to dates
      }));

      // Create unified plan object for blazing-fast CTE-based save
      const unifiedPlan = {
        ...planToSave,
        scheduledTasks: tasksWithoutDates
      };

      const { data, error } = await supabase.rpc("save_goal_plan", {
        p_title: intel.title,
        p_modality: intel.modality,
        p_target_date: '', // No deadline for checklists (DB treats empty as NULL)
        p_milestones: unifiedPlan.milestones,
        p_tasks: unifiedPlan.scheduledTasks,
        p_description: intel.context || null,
      });

      if (error) throw error;
      const goalId = data as string;
      toast({ title: "Checklist saved!" });
      navigate(`/goals/${goalId}`);
    } catch (e: any) {
      toast({ title: "Save failed", description: String(e?.message || e), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingAnimation label="Architecting your plan..." />;
  if (error || !blueprint) return <ErrorMessage message={error || "Unknown error"} />;

  // Dual-path rendering based on modality
  if (intel.modality === 'checklist') {
    return (
      <main className="mx-auto max-w-screen-md p-4 pb-40">
        <h1 className="sr-only">Checklist Review</h1>

        <PlanOutlineView plan={blueprint.plan} showDurations={false} />

        <ChecklistActionFooter
          blueprint={blueprint as any} // Cast to handle checklist-specific status
          intel={intel}
          recomputing={recomputing}
          saving={saving}
          onAction={handleChecklistAction}
        />
      </main>
    );
  }

  // Project path (default)
  return (
    <main className="mx-auto max-w-screen-md p-4 pb-40">
      <h1 className="sr-only">Plan Review</h1>

      <PlanOutlineView plan={blueprint.plan} showDurations={true} />

        <ProjectActionFooter
          blueprint={blueprint}
          intel={intel}
          userConstraints={userConstraints}
          recomputing={recomputing}
          saving={saving}
          onAction={handleProjectAction}
        />
    </main>
  );
};

export default PlanReviewScreen;
