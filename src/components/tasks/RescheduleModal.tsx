import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { CalendarIcon, AlertTriangleIcon, CheckCircleIcon, Loader2Icon } from 'lucide-react';
import { format, addDays } from 'date-fns';
import { useLivingPlan } from '@/hooks/useLivingPlan';
import { supabase } from '@/integrations/supabase/client';

interface Props {
  taskId: string | null;
  taskTitle: string;
  currentStartDate: string | null;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface TaskInfo {
  id: string;
  title: string;
  start_date: string | null;
  end_date: string | null;
  is_anchored: boolean;
  goal_id: string;
  milestone_id: string;
  duration_hours: number;
}

interface TaskBoundaries {
  earliestAllowedDate: Date;
  latestAllowedDate: Date | null;
}

export const RescheduleModal = ({ taskId, taskTitle, currentStartDate, onOpenChange, onSuccess }: Props) => {
  const open = !!taskId;
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [rescheduleResult, setRescheduleResult] = useState<any>(null);
  const [step, setStep] = useState<'select' | 'preview' | 'processing'>('select');
  const [taskInfo, setTaskInfo] = useState<TaskInfo | null>(null);
  const [goalTasks, setGoalTasks] = useState<TaskInfo[]>([]);
  const [taskBoundaries, setTaskBoundaries] = useState<TaskBoundaries | null>(null);
  
  const { isProcessing, rescheduleTask, commitPlanUpdate } = useLivingPlan();

  // Fetch task info and calculate constraints when modal opens
  useEffect(() => {
    if (!taskId || !open) return;

    const fetchTaskConstraints = async () => {
      try {
        // Get the specific task info
        const { data: task, error: taskError } = await supabase
          .from('tasks')
          .select('id, title, start_date, end_date, is_anchored, goal_id, milestone_id, duration_hours')
          .eq('id', taskId)
          .single();

        if (taskError || !task) return;
        setTaskInfo(task);

        // Get all tasks in the same goal to understand dependencies
        const { data: allTasks, error: tasksError } = await supabase
          .from('tasks')
          .select('id, title, start_date, end_date, is_anchored, goal_id, milestone_id, duration_hours')
          .eq('goal_id', task.goal_id)
          .order('start_date', { ascending: true });

        if (tasksError) return;
        setGoalTasks(allTasks || []);

        // Calculate task boundaries using Smart Calendar logic
        const boundaries = getTaskBoundaries(task, allTasks || []);
        setTaskBoundaries(boundaries);
      } catch (error) {
        console.error('Error fetching task constraints:', error);
        // Fallback to today only
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        setTaskBoundaries({ earliestAllowedDate: today, latestAllowedDate: null });
      }
    };

    fetchTaskConstraints();
  }, [taskId, open]);

  // Smart Calendar: Calculate task boundaries based on Tidal Wave logic
  const getTaskBoundaries = (selectedTask: TaskInfo, allTasksInGoal: TaskInfo[]): TaskBoundaries => {
    const sortedTasks = allTasksInGoal
      .filter(t => t.start_date) // Only tasks with start dates
      .sort((a, b) => new Date(a.start_date!).getTime() - new Date(b.start_date!).getTime());
    
    const currentIndex = sortedTasks.findIndex(t => t.id === selectedTask.id);
    
    // === 1. Calculate the EARLIEST allowed date (floor) ===
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let earliestAllowedDate = today;
    
    if (currentIndex > 0) {
      // Find the task that comes directly before this one
      const previousTask = sortedTasks[currentIndex - 1];
      if (previousTask.end_date) {
        const canStartAfter = new Date(previousTask.end_date);
        canStartAfter.setDate(canStartAfter.getDate() + 1);
        earliestAllowedDate = canStartAfter > today ? canStartAfter : today;
      }
    }
    
    // === 2. Calculate the LATEST allowed date (ceiling) ===
    let latestAllowedDate: Date | null = null;
    
    // Find the very next anchored task in the sequence
    let nextAnchor: TaskInfo | null = null;
    for (let i = currentIndex + 1; i < sortedTasks.length; i++) {
      if (sortedTasks[i].is_anchored) {
        nextAnchor = sortedTasks[i];
        break;
      }
    }
    
    if (nextAnchor && nextAnchor.start_date) {
      // Calculate total duration of all tasks between current task and anchor
      const tasksInBetween = sortedTasks.slice(currentIndex, sortedTasks.findIndex(t => t.id === nextAnchor!.id));
      const totalDurationDays = tasksInBetween.reduce((sum, task) => {
        // Convert hours to days (assuming 8-hour work days)
        const taskDays = Math.ceil((task.duration_hours || 8) / 8);
        return sum + taskDays;
      }, 0);
      
      // The latest this block can start is anchor_start_date - total_duration
      const anchorStartDate = new Date(nextAnchor.start_date);
      latestAllowedDate = new Date(anchorStartDate);
      latestAllowedDate.setDate(anchorStartDate.getDate() - totalDurationDays);
      
      // Ensure latest date is not before earliest date
      if (latestAllowedDate < earliestAllowedDate) {
        latestAllowedDate = null; // No valid window exists
      }
    }
    
    return { earliestAllowedDate, latestAllowedDate };
  };

  const handleDateSelect = async (date: Date | undefined) => {
    if (!date || !taskId) return;
    
    setSelectedDate(date);
    setStep('processing');
    
    const result = await rescheduleTask(taskId, format(date, 'yyyy-MM-dd'));
    setRescheduleResult(result);
    setStep('preview');
  };

  const handleConfirm = async () => {
    if (!rescheduleResult || rescheduleResult.status === 'error') return;
    
    setStep('processing');
    const success = await commitPlanUpdate(rescheduleResult.updatedTasks);
    
    if (success) {
      onSuccess();
      onOpenChange(false);
      resetModal();
    } else {
      setStep('preview');
    }
  };

  const resetModal = () => {
    setSelectedDate(undefined);
    setRescheduleResult(null);
    setStep('select');
    setTaskInfo(null);
    setGoalTasks([]);
    setTaskBoundaries(null);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) resetModal();
    onOpenChange(open);
  };

  // Smart Calendar: Simplified date validation using pre-computed boundaries
  const isDateDisabled = (date: Date) => {
    if (!taskBoundaries) return true; // Disable all dates if boundaries not calculated yet
    
    // Disable dates before the earliest allowed date
    if (date < taskBoundaries.earliestAllowedDate) return true;
    
    // Disable dates after the latest allowed date (if there is one)
    if (taskBoundaries.latestAllowedDate && date > taskBoundaries.latestAllowedDate) return true;
    
    return false;
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarIcon className="w-5 h-5" />
            Reschedule Task
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            {taskTitle}
          </p>
        </DialogHeader>

        {step === 'select' && (
          <div className="space-y-4">
            <div className="text-sm space-y-2">
              <div>
                <p className="font-medium">Current start date:</p>
                <p className="text-muted-foreground">
                  {currentStartDate ? format(new Date(currentStartDate), 'PPP') : 'Not scheduled'}
                </p>
              </div>
              {taskInfo && (
                <div>
                  <p className="font-medium">Task type:</p>
                  <div className="flex items-center gap-2">
                    <p className="text-muted-foreground">
                      {taskInfo.is_anchored ? '📌 Anchored' : '🌊 Floating'}
                    </p>
                    {!taskInfo.is_anchored && (
                      <span className="text-xs text-muted-foreground">
                        (moves with dependencies)
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
            
            <div>
              <p className="text-sm font-medium mb-2">Select new start date:</p>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={handleDateSelect}
                disabled={isDateDisabled}
                className="rounded-md border pointer-events-auto"
              />
            </div>
            
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground">
                💡 {taskInfo?.is_anchored 
                  ? 'This anchored task can be moved independently without affecting other tasks.'
                  : 'Moving this floating task triggers the "Tidal Wave" - all tasks after it will shift forward to maintain the sequence.'}
              </p>
              {taskBoundaries && (
                <div className="mt-2 space-y-1">
                  <p className="text-xs text-blue-600">
                    📅 Available window: {format(taskBoundaries.earliestAllowedDate, 'MMM d')}
                    {taskBoundaries.latestAllowedDate && ` to ${format(taskBoundaries.latestAllowedDate, 'MMM d')}`}
                  </p>
                  {taskBoundaries.latestAllowedDate && (
                    <p className="text-xs text-amber-600">
                      ⚠️ Limited by next anchored task - moving later would cause conflicts
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {step === 'processing' && (
          <div className="flex items-center justify-center py-8">
            <div className="text-center space-y-3">
              <Loader2Icon className="w-8 h-8 animate-spin mx-auto text-primary" />
              <p className="text-sm text-muted-foreground">
                Calculating schedule changes...
              </p>
            </div>
          </div>
        )}

        {step === 'preview' && rescheduleResult && (
          <div className="space-y-4">
            {rescheduleResult.status === 'success' && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                <div className="flex items-center gap-2 text-emerald-800 mb-2">
                  <CheckCircleIcon className="w-4 h-4" />
                  <span className="font-medium">Ready to Reschedule</span>
                </div>
                <p className="text-sm text-emerald-700">
                  {rescheduleResult.message}
                </p>
                {rescheduleResult.updatedTasks && (
                  <p className="text-xs text-emerald-600 mt-1">
                    {rescheduleResult.updatedTasks.length} tasks will be updated
                  </p>
                )}
              </div>
            )}

            {rescheduleResult.status === 'reschedule_conflict' && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="flex items-center gap-2 text-amber-800 mb-2">
                  <AlertTriangleIcon className="w-4 h-4" />
                  <span className="font-medium">Schedule Conflict Detected</span>
                </div>
                <p className="text-sm text-amber-700">
                  {rescheduleResult.message}
                </p>
                {rescheduleResult.conflictInfo && (
                  <div className="mt-2 space-y-1">
                    <Badge variant="outline" className="text-xs">
                      📌 {rescheduleResult.conflictInfo.anchoredTaskTitle}
                    </Badge>
                    <p className="text-xs text-amber-600">
                      {rescheduleResult.conflictInfo.compressionNeeded} days of overlap detected
                    </p>
                  </div>
                )}
              </div>
            )}

            {rescheduleResult.status === 'error' && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center gap-2 text-red-800 mb-2">
                  <AlertTriangleIcon className="w-4 h-4" />
                  <span className="font-medium">Reschedule Failed</span>
                </div>
                <p className="text-sm text-red-700">
                  {rescheduleResult.error || 'An error occurred while calculating the reschedule'}
                </p>
              </div>
            )}
          </div>
        )}

        <DialogFooter className="flex-row justify-between">
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          
          {step === 'preview' && rescheduleResult?.status !== 'error' && (
            <Button
              onClick={handleConfirm}
              disabled={isProcessing}
              className={rescheduleResult.status === 'reschedule_conflict' ? 'bg-amber-600 hover:bg-amber-700' : ''}
            >
              {isProcessing && <Loader2Icon className="w-4 h-4 animate-spin mr-2" />}
              {rescheduleResult.status === 'reschedule_conflict' ? 'Reschedule Anyway' : 'Confirm Reschedule'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};