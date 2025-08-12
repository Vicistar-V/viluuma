import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import LoadingAnimation from "@/components/plan/LoadingAnimation";
import ErrorMessage from "@/components/plan/ErrorMessage";
import PlanOutlineView from "@/components/plan/PlanOutlineView";
import ActionFooter from "@/components/plan/ActionFooter";

interface Intel {
  title: string;
  modality: "project" | "checklist";
  deadline: string | null;
  hoursPerWeek?: number;
  context?: string;
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
  status: "success" | "under_scoped" | "over_scoped" | "low_quality";
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
        console.log("Calling generate-plan with intel:", intel);
        const { data, error } = await supabase.functions.invoke("generate-plan", {
          body: { intel },
        });
        console.log("Generate-plan response:", { data, error });
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

  const handleAction = async (action: {
    type: 'SAVE' | 'REGENERATE' | 'ACCEPT_AND_SAVE';
    plan?: any;
    newDeadline?: string;
    options?: { compression_requested?: boolean; expansion_requested?: boolean };
  }) => {
    if (!intel) return;

    if (action.type === 'SAVE') {
      return handleSave(action.plan);
    }

    if (action.type === 'ACCEPT_AND_SAVE') {
      return handleSave(action.plan, action.newDeadline);
    }

    if (action.type === 'REGENERATE') {
      try {
        setRecomputing(true);
        const { data, error } = await supabase.functions.invoke("generate-plan", {
          body: { 
            intel, 
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

  const handleSave = async (plan?: any, newDeadline?: string) => {
    const planToSave = plan || blueprint?.plan;
    if (!intel || !planToSave) return;
    
    try {
      setSaving(true);
      const start = new Date();
      const addDays = (date: Date, days: number) => {
        const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
        d.setUTCDate(d.getUTCDate() + days);
        return d;
      };

      const tasksPayload = planToSave.scheduledTasks.map((t: any) => {
        const startDate = addDays(start, t.start_day_offset);
        const endDate = addDays(start, t.end_day_offset);
        return {
          title: t.title,
          description: t.description,
          duration_hours: t.duration_hours,
          start_date: startDate.toISOString().slice(0, 10),
          end_date: endDate.toISOString().slice(0, 10),
          milestone_index: t.milestone_index,
          priority: t.priority,
          is_anchored: true,
        };
      });

      // Use the new deadline if provided (for extended deadline scenarios)
      const targetDate = newDeadline || intel.deadline;

      const { data, error } = await supabase.rpc("save_goal_plan", {
        p_title: intel.title,
        p_modality: intel.modality,
        p_target_date: targetDate,
        p_milestones: planToSave.milestones,
        p_tasks: tasksPayload,
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

  if (loading) return <LoadingAnimation label="Architecting your plan..." />;
  if (error || !blueprint) return <ErrorMessage message={error || "Unknown error"} />;

  return (
    <main className="mx-auto max-w-screen-md p-4 pb-40">
      <h1 className="sr-only">Plan Review</h1>

      <PlanOutlineView plan={blueprint.plan} />

      <ActionFooter
        blueprint={blueprint}
        intel={intel}
        recomputing={recomputing}
        saving={saving}
        onAction={handleAction}
      />
    </main>
  );
};

export default PlanReviewScreen;
