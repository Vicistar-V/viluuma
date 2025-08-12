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
}

export const RescheduleModal = ({ taskId, taskTitle, currentStartDate, onOpenChange, onSuccess }: Props) => {
  const open = !!taskId;
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [rescheduleResult, setRescheduleResult] = useState<any>(null);
  const [step, setStep] = useState<'select' | 'preview' | 'processing'>('select');
  const [taskInfo, setTaskInfo] = useState<TaskInfo | null>(null);
  const [goalTasks, setGoalTasks] = useState<TaskInfo[]>([]);
  const [minValidDate, setMinValidDate] = useState<Date>(new Date());
  
  const { isProcessing, rescheduleTask, commitPlanUpdate } = useLivingPlan();

  // Fetch task info and calculate constraints when modal opens
  useEffect(() => {
    if (!taskId || !open) return;

    const fetchTaskConstraints = async () => {
      try {
        // Get the specific task info
        const { data: task, error: taskError } = await supabase
          .from('tasks')
          .select('id, title, start_date, end_date, is_anchored, goal_id, milestone_id')
          .eq('id', taskId)
          .single();

        if (taskError || !task) return;
        setTaskInfo(task);

        // Get all tasks in the same goal to understand dependencies
        const { data: allTasks, error: tasksError } = await supabase
          .from('tasks')
          .select('id, title, start_date, end_date, is_anchored, goal_id, milestone_id')
          .eq('goal_id', task.goal_id)
          .order('start_date', { ascending: true });

        if (tasksError) return;
        setGoalTasks(allTasks || []);

        // Calculate minimum valid date based on Smart Calendar logic
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (task.is_anchored) {
          // Anchored tasks can be moved to today or later
          setMinValidDate(today);
        } else {
          // Floating tasks need to consider dependencies
          const precedingTasks = (allTasks || [])
            .filter(t => t.id !== taskId && t.start_date && task.start_date && t.start_date < task.start_date)
            .sort((a, b) => new Date(b.start_date!).getTime() - new Date(a.start_date!).getTime());

          if (precedingTasks.length > 0) {
            // Find the latest end date of preceding tasks
            const latestPrecedingEndDate = precedingTasks.reduce((latest, t) => {
              if (!t.end_date) return latest;
              const endDate = new Date(t.end_date);
              return endDate > latest ? endDate : latest;
            }, today);

            // Add one day after the latest preceding task ends
            const minDate = new Date(latestPrecedingEndDate);
            minDate.setDate(minDate.getDate() + 1);
            setMinValidDate(minDate > today ? minDate : today);
          } else {
            // No preceding tasks, can start today
            setMinValidDate(today);
          }
        }
      } catch (error) {
        console.error('Error fetching task constraints:', error);
        // Fallback to today
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        setMinValidDate(today);
      }
    };

    fetchTaskConstraints();
  }, [taskId, open]);

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
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    setMinValidDate(today);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) resetModal();
    onOpenChange(open);
  };

  // Smart Calendar: Calculate which dates should be disabled
  const isDateDisabled = (date: Date) => {
    // Never allow past dates
    if (date < minValidDate) return true;

    // If this is an anchored task, only block past dates
    if (taskInfo?.is_anchored) return false;

    // For floating tasks, check for conflicts with anchored tasks that come after
    const targetTaskIndex = goalTasks.findIndex(t => t.id === taskId);
    if (targetTaskIndex === -1) return false;

    // Find anchored tasks that come after this task in the sequence
    const laterAnchoredTasks = goalTasks
      .slice(targetTaskIndex + 1)
      .filter(t => t.is_anchored && t.start_date);

    // Check if moving to this date would conflict with any later anchored tasks
    for (const anchoredTask of laterAnchoredTasks) {
      const anchoredStartDate = new Date(anchoredTask.start_date!);
      
      // Calculate how long this task sequence would take if we start on the selected date
      // This is a simplified calculation - in reality we'd need to calculate the full chain
      const daysBetween = Math.ceil((anchoredStartDate.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
      
      // If there's not enough time between the selected date and the anchored task, disable it
      // This is a simplified heuristic - we're assuming each task takes at least 1 day
      const tasksInBetween = goalTasks.slice(targetTaskIndex, goalTasks.findIndex(t => t.id === anchoredTask.id)).length;
      if (daysBetween < tasksInBetween) {
        return true;
      }
    }

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
                  : 'Moving this floating task will automatically reschedule all tasks that come after it, unless they are anchored with 📌.'}
              </p>
              {minValidDate > new Date() && (
                <p className="text-xs text-amber-600 mt-1">
                  ⚠️ Earliest valid date: {format(minValidDate, 'PPP')}
                </p>
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