import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { BottomNav } from "@/components/BottomNav";
import ThemeToggle from "@/components/ThemeToggle";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Trash2, PencilLine, CheckCircle2, CalendarIcon, Ellipsis } from "lucide-react";

import TaskDetailModal from "@/components/tasks/TaskDetailModal";

interface Goal { id: string; title: string; modality: 'project'|'checklist'; status: string; total_tasks: number; completed_tasks: number; target_date?: string | null; }
interface Milestone { id: string; goal_id: string; title: string; status: string; order_index: number | null; total_tasks: number; completed_tasks: number; }
interface Task { id: string; goal_id: string; milestone_id: string; user_id: string; title: string; description?: string | null; status: 'pending'|'completed'; priority?: string | null; start_date?: string | null; end_date?: string | null; duration_hours?: number | null; is_anchored: boolean; }

const GoalDetailScreen = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { toast } = useToast();

  const [goal, setGoal] = useState<Goal | null>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [editingMilestoneId, setEditingMilestoneId] = useState<string | null>(null);
  const [deleteMilestoneId, setDeleteMilestoneId] = useState<string | null>(null);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);

  useEffect(() => { document.title = "Goal"; }, []);
  useEffect(() => { if (!loading && !user) navigate('/login'); }, [user, loading, navigate]);

  const refresh = async () => {
    if (!id) return;
    const [{ data: goalData, error: goalErr }, { data: msData }, { data: tData }] = await Promise.all([
      supabase.from('goals').select('*').eq('id', id).maybeSingle(),
      supabase.from('milestones').select('*').eq('goal_id', id).order('order_index', { ascending: true, nullsFirst: false }).order('created_at'),
      supabase.from('tasks').select('*').eq('goal_id', id)
    ]);
    if (goalErr) { toast({ title: 'Error', description: goalErr.message }); return; }
    setGoal(goalData as any);
    setMilestones((msData || []) as any);
    setTasks((tData || []) as any);
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

  const addMilestone = async () => {
    if (!id) return;
    const { data, error } = await supabase.rpc('create_milestone', { p_goal_id: id, p_title: 'New milestone' });
    if (error) return toast({ title: 'Error', description: error.message });
    await refresh();
    setEditingMilestoneId(data as string);
  };

  const saveMilestoneTitle = async (m: Milestone, title: string) => {
    if (!title.trim() || title === m.title) { setEditingMilestoneId(null); return; }
    const { error } = await supabase.rpc('update_milestone_title', { p_milestone_id: m.id, p_title: title.trim() });
    if (error) return toast({ title: 'Error', description: error.message });
    setEditingMilestoneId(null); refresh();
  };

  const deleteMilestone = async () => {
    if (!deleteMilestoneId) return;
    const { error } = await supabase.rpc('delete_milestone_and_tasks', { p_milestone_id: deleteMilestoneId });
    if (error) return toast({ title: 'Error', description: error.message });
    setDeleteMilestoneId(null); refresh();
  };

  const addTask = async (milestoneId: string) => {
    const { data, error } = await supabase.rpc('create_task', { p_milestone_id: milestoneId, p_title: 'New task' });
    if (error) return toast({ title: 'Error', description: error.message });
    await refresh();
    setActiveTaskId(data as string);
  };

  const toggleTask = async (task: Task) => {
    const next = task.status === 'pending' ? 'completed' : 'pending';
    const { error } = await supabase.from('tasks').update({ status: next }).eq('id', task.id);
    if (error) return toast({ title: 'Error', description: error.message });
    refresh();
  };

  const removeTask = async (task: Task) => {
    const { error } = await supabase.rpc('delete_task', { p_task_id: task.id });
    if (error) return toast({ title: 'Error', description: error.message });
    refresh();
  };

  if (loading || !user) return null;
  if (!goal) return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CalendarIcon className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-semibold">Goal</h1>
          </div>
          <ThemeToggle />
        </div>
      </header>
      <main className="container mx-auto px-4 py-6">Loading...</main>
      <BottomNav />
    </div>
  );

  const progress = goal.total_tasks ? Math.round((goal.completed_tasks / goal.total_tasks) * 100) : 0;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-semibold">{goal.title}</h1>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 pb-28 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
              <span>{goal.completed_tasks} / {goal.total_tasks} tasks</span>
              <span>{progress}%</span>
            </div>
            <Progress value={progress} />
          </CardContent>
        </Card>

        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Outline</h2>
          <Button size="sm" onClick={addMilestone}><Plus className="mr-1" /> Add Milestone</Button>
        </div>

        <Accordion type="multiple" className="space-y-2">
          {milestones.map((m) => (
            <AccordionItem key={m.id} value={m.id} className="border rounded-lg px-3">
              <AccordionTrigger className="hover:no-underline">
                <div className="w-full flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {editingMilestoneId === m.id ? (
                      <Input
                        defaultValue={m.title}
                        autoFocus
                        onBlur={(e) => saveMilestoneTitle(m, e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                          if (e.key === 'Escape') setEditingMilestoneId(null);
                        }}
                        className="h-8"
                      />
                    ) : (
                      <div className="text-left">
                        <div className="font-medium">{m.title}</div>
                        <div className="text-xs text-muted-foreground">{m.completed_tasks} / {m.total_tasks} done</div>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); setEditingMilestoneId(m.id); }} aria-label="Edit title">
                      <PencilLine />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); setDeleteMilestoneId(m.id); }} aria-label="Delete">
                      <Trash2 />
                    </Button>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-2">
                  {(groupedTasks[m.id] || []).map((t) => (
                    <div key={t.id} className="flex items-center justify-between rounded-md border p-3">
                      <div className="flex items-center gap-3">
                        <input
                          aria-label="Toggle"
                          type="checkbox"
                          checked={t.status === 'completed'}
                          onChange={() => toggleTask(t)}
                          className="h-5 w-5"
                        />
                        <button className="text-left" onClick={() => setActiveTaskId(t.id)}>
                          <div className="font-medium leading-tight">{t.title}</div>
                          {goal.modality === 'project' && t.duration_hours ? (
                            <div className="text-xs text-muted-foreground">{t.duration_hours}h</div>
                          ) : null}
                        </button>
                      </div>

                      <div className="flex items-center gap-1">
                        <Button size="icon" variant="ghost" onClick={() => setActiveTaskId(t.id)} aria-label="Edit">
                          <PencilLine />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => removeTask(t)} aria-label="Delete">
                          <Trash2 />
                        </Button>
                      </div>
                    </div>
                  ))}

                  <Button variant="secondary" size="sm" onClick={() => addTask(m.id)}>
                    <Plus className="mr-1" /> Add Task
                  </Button>
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>

        <Separator />

      </main>

      <TaskDetailModal
        taskId={activeTaskId}
        onOpenChange={(open) => !open && setActiveTaskId(null)}
        goalModality={goal.modality}
        onSaved={refresh}
      />

      <AlertDialog open={!!deleteMilestoneId} onOpenChange={(o) => !o && setDeleteMilestoneId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this milestone?</AlertDialogTitle>
          </AlertDialogHeader>
          <div className="text-sm text-muted-foreground">
            This will also delete all tasks inside.
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={deleteMilestone} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <BottomNav />
    </div>
  );
};

export default GoalDetailScreen;
