import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { BottomNav } from "@/components/BottomNav";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

// Import our new components
import { GoalDetailHeader } from "@/components/goals/GoalDetailHeader";
import { GoalOverviewCard } from "@/components/goals/GoalOverviewCard";
import { ActiveProjectView } from "@/components/goals/ActiveProjectView";
import { ActiveChecklistView } from "@/components/goals/ActiveChecklistView";
import { CompletedGoalView } from "@/components/goals/CompletedGoalView";
import { ArchivedGoalModal } from "@/components/goals/ArchivedGoalModal";
import TaskDetailModal from "@/components/tasks/TaskDetailModal";
import { PlanUpdateOverlay } from "@/components/ui/plan-update-overlay";

interface Goal { 
  id: string; 
  title: string; 
  modality: 'project'|'checklist'; 
  status: 'active' | 'archived' | 'completed';
  total_tasks: number; 
  completed_tasks: number; 
  target_date?: string | null; 
  weekly_hours?: number | null;
  created_at: string;
  updated_at: string;
  completed_at?: string | null;
  archive_status: 'active' | 'user_archived' | 'system_archived';
}
interface Milestone { 
  id: string; 
  goal_id: string; 
  title: string; 
  status: string; 
  order_index: number | null; 
  total_tasks: number; 
  completed_tasks: number; 
}
interface Task { 
  id: string; 
  goal_id: string; 
  milestone_id: string; 
  user_id: string; 
  title: string; 
  description?: string | null; 
  status: 'pending'|'completed'; 
  priority?: string | null; 
  start_date?: string | null; 
  end_date?: string | null; 
  duration_hours?: number | null; 
  is_anchored: boolean; 
}

const GoalDetailScreen = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { toast } = useToast();

  const [goal, setGoal] = useState<Goal | null>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [showArchivedModal, setShowArchivedModal] = useState(false);
  const [showPlanUpdateOverlay, setShowPlanUpdateOverlay] = useState(false);

  useEffect(() => { 
    if (goal) {
      document.title = goal.title;
    }
  }, [goal]);
  
  useEffect(() => { 
    if (!loading && !user) navigate('/login'); 
  }, [user, loading, navigate]);

  // Handle archived goals
  useEffect(() => {
    if (goal?.status === 'archived') {
      setShowArchivedModal(true);
    }
  }, [goal?.status]);

  const refresh = async (showOverlay = false) => {
    if (!id) return;
    
    if (showOverlay) {
      setShowPlanUpdateOverlay(true);
    }
    
    try {
      const [{ data: goalData, error: goalErr }, { data: msData }, { data: tData }] = await Promise.all([
        supabase.from('goals_with_computed_status').select('*').eq('id', id).maybeSingle(),
        supabase.from('milestones_with_computed_status').select('*').eq('goal_id', id).order('order_index', { ascending: true, nullsFirst: false }).order('created_at'),
        supabase.from('tasks').select('*').eq('goal_id', id).order('start_date', { ascending: true, nullsFirst: false }).order('created_at')
      ]);
      
      if (goalErr) { 
        toast({ title: 'Error', description: goalErr.message }); 
        return; 
      }
      
      setGoal(goalData as any);
      setMilestones((msData || []) as any);
      setTasks((tData || []) as any);
      
      if (showOverlay) {
        // Show success briefly
        setTimeout(() => {
          setShowPlanUpdateOverlay(false);
          toast({
            title: "Plan Updated",
            description: "Your schedule has been intelligently adjusted"
          });
        }, 1500);
      }
    } catch (error: any) {
      toast({ 
        title: 'Error', 
        description: error.message || 'Failed to refresh data' 
      });
    } finally {
      if (showOverlay) {
        setShowPlanUpdateOverlay(false);
      }
    }
  };

  useEffect(() => { refresh(); }, [id]);

  const groupedTasks = useMemo(() => {
    const map: Record<string, Task[]> = {};
    for (const t of tasks) {
      if (!map[t.milestone_id]) map[t.milestone_id] = [];
      map[t.milestone_id].push(t);
    }
    return map;
  }, [tasks]);

  // Enhanced handlers
  const handleTitleUpdate = async (newTitle: string): Promise<void> => {
    if (!goal) return;
    const { error } = await supabase.from('goals').update({ title: newTitle }).eq('id', goal.id);
    if (error) {
      toast({ title: 'Error', description: error.message });
      return;
    }
    setGoal({ ...goal, title: newTitle });
  };

  const handleStatusChange = async (status: 'active' | 'archived' | 'completed'): Promise<void> => {
    if (!goal) return;
    
    if (status === 'archived') {
      // Use the archive status for archiving
      const { error } = await supabase.from('goals').update({ archive_status: 'user_archived' }).eq('id', goal.id);
      if (error) {
        toast({ title: 'Error', description: error.message });
        return;
      }
    } else if (status === 'active') {
      // Reactivate by setting archive status to active
      const { error } = await supabase.from('goals').update({ archive_status: 'active' }).eq('id', goal.id);
      if (error) {
        toast({ title: 'Error', description: error.message });
        return;
      }
    }
    // Completed status is now computed automatically, no manual update needed
    
    // Refresh to get the computed status
    await refresh();
    
    if (status === 'completed') {
      toast({ title: "🎉 Goal Completed!", description: "Congratulations on your achievement!" });
    }
  };

  const handleDelete = async (): Promise<void> => {
    if (!goal) return;
    const { error } = await supabase.from('goals').delete().eq('id', goal.id);
    if (error) {
      toast({ title: 'Error', description: error.message });
      return;
    }
    navigate('/goals');
  };

  const handleMilestoneEdit = async (milestone: Milestone, newTitle: string): Promise<void> => {
    const { error } = await supabase.rpc('update_milestone_title', { p_milestone_id: milestone.id, p_title: newTitle });
    if (error) {
      toast({ title: 'Error', description: error.message });
      return;
    }
    refresh();
  };

  const handleMilestoneDelete = async (milestoneId: string): Promise<void> => {
    const { error } = await supabase.rpc('delete_milestone_and_tasks', { p_milestone_id: milestoneId });
    if (error) {
      toast({ title: 'Error', description: error.message });
      return;
    }
    refresh();
  };

  const addMilestone = async (): Promise<void> => {
    if (!id) return;
    const { data, error } = await supabase.rpc('create_milestone', { p_goal_id: id, p_title: 'New milestone' });
    if (error) {
      toast({ title: 'Error', description: error.message });
      return;
    }
    refresh();
  };

  const addTask = async (milestoneId: string): Promise<void> => {
    const { data, error } = await supabase.rpc('create_task', { p_milestone_id: milestoneId, p_title: 'New task' });
    if (error) {
      toast({ title: 'Error', description: error.message });
      return;
    }
    await refresh();
    setActiveTaskId(data as string);
  };

  const toggleTask = async (task: Task): Promise<void> => {
    const next = task.status === 'pending' ? 'completed' : 'pending';
    const { error } = await supabase.from('tasks').update({ status: next }).eq('id', task.id);
    if (error) {
      toast({ title: 'Error', description: error.message });
      return;
    }
    
    // Clean up task reminder if task was completed
    if (next === 'completed') {
      const { cleanupTaskReminder } = await import('@/lib/taskReminderCleanup');
      await cleanupTaskReminder(task.id);
    }
    
    refresh();
  };

  const removeTask = async (task: Task): Promise<void> => {
    // Clean up task reminder before deletion
    const { cleanupTaskReminder } = await import('@/lib/taskReminderCleanup');
    await cleanupTaskReminder(task.id);

    const { error } = await supabase.rpc('delete_task', { p_task_id: task.id });
    if (error) {
      toast({ title: 'Error', description: error.message });
      return;
    }
    refresh();
  };

  if (loading || !user) return null;
  if (!goal) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <div className="text-lg text-muted-foreground">Loading goal...</div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <GoalDetailHeader
        goal={goal}
        onTitleUpdate={handleTitleUpdate}
        onStatusChange={handleStatusChange}
        onDelete={handleDelete}
      />

      <main className="container mx-auto px-4 py-6 pb-28 space-y-6">
        <GoalOverviewCard goal={goal} />

        {goal.status === 'completed' ? (
          <CompletedGoalView
            goal={goal}
            milestones={milestones}
            groupedTasks={groupedTasks}
          />
        ) : goal.modality === 'project' ? (
          <ActiveProjectView
            milestones={milestones}
            groupedTasks={groupedTasks}
            onMilestoneEdit={handleMilestoneEdit}
            onMilestoneDelete={handleMilestoneDelete}
            onTaskToggle={toggleTask}
            onTaskEdit={(taskId) => setActiveTaskId(taskId)}
            onTaskDelete={removeTask}
            onAddTask={addTask}
            onAddMilestone={addMilestone}
          />
        ) : (
          <ActiveChecklistView
            milestones={milestones}
            groupedTasks={groupedTasks}
            onMilestoneEdit={handleMilestoneEdit}
            onMilestoneDelete={handleMilestoneDelete}
            onTaskToggle={toggleTask}
            onTaskEdit={(taskId) => setActiveTaskId(taskId)}
            onTaskDelete={removeTask}
            onAddTask={addTask}
            onAddMilestone={addMilestone}
          />
        )}
      </main>

      <TaskDetailModal
        taskId={activeTaskId}
        onOpenChange={(open) => !open && setActiveTaskId(null)}
        goalModality={goal.modality}
        goalStatus={goal.status}
        onSaved={() => refresh(true)}
      />

      <ArchivedGoalModal
        goal={showArchivedModal ? goal : null}
        milestones={milestones}
        groupedTasks={groupedTasks}
        onClose={() => setShowArchivedModal(false)}
        onReactivate={async () => {
          await handleStatusChange('active');
          setShowArchivedModal(false);
        }}
      />

      <BottomNav />
      
      {/* Living Plan Update Overlay */}
      <PlanUpdateOverlay 
        show={showPlanUpdateOverlay}
        title="Updating your plan..."
        description="Calculating the ripple effects and adjusting your schedule"
      />
    </div>
  );
};

export default GoalDetailScreen;
