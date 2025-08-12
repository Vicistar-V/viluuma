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

interface ConflictInfo {
  hasConflict: boolean;
  conflictingAnchor?: {
    id: string;
    title: string;
    start_date: string;
  };
  message?: string;
}

export const RescheduleModal = ({ taskId, taskTitle, currentStartDate, onOpenChange, onSuccess }: Props) => {
  const open = !!taskId;
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [conflictInfo, setConflictInfo] = useState<ConflictInfo>({ hasConflict: false });
  const [rescheduleResult, setRescheduleResult] = useState<any>(null);
  const [step, setStep] = useState<'select' | 'preview' | 'processing'>('select');
  const [taskInfo, setTaskInfo] = useState<TaskInfo | null>(null);
  const [goalTasks, setGoalTasks] = useState<TaskInfo[]>([]);
  
  const { isProcessing, rescheduleTask, commitPlanUpdate } = useLivingPlan();

  // Fetch task info when modal opens
  useEffect(() => {
    if (!taskId || !open) return;

    const fetchTaskInfo = async () => {
      try {
        // Get the specific task info
        const { data: task, error: taskError } = await supabase
          .from('tasks')
          .select('id, title, start_date, end_date, is_anchored, goal_id, milestone_id, duration_hours')
          .eq('id', taskId)
          .single();

        if (taskError || !task) return;
        setTaskInfo(task);

        // Get all tasks in the same goal
        const { data: allTasks, error: tasksError } = await supabase
          .from('tasks')
          .select('id, title, start_date, end_date, is_anchored, goal_id, milestone_id, duration_hours')
          .eq('goal_id', task.goal_id)
          .order('start_date', { ascending: true });

        if (tasksError) return;
        setGoalTasks(allTasks || []);
      } catch (error) {
        console.error('Error fetching task info:', error);
      }
    };

    fetchTaskInfo();
  }, [taskId, open]);
  // Smart conflict detection when user selects a date
  const checkForConflicts = (selectedDate: Date, selectedTask: TaskInfo, allTasks: TaskInfo[]): ConflictInfo => {
    // Sort tasks by start date to understand sequence
    const sortedTasks = allTasks
      .filter(t => t.start_date)
      .sort((a, b) => new Date(a.start_date!).getTime() - new Date(b.start_date!).getTime());
    
    const currentIndex = sortedTasks.findIndex(t => t.id === selectedTask.id);
    if (currentIndex === -1) return { hasConflict: false };
    
    // Find the next anchored task in the sequence
    let nextAnchor: TaskInfo | null = null;
    for (let i = currentIndex + 1; i < sortedTasks.length; i++) {
      if (sortedTasks[i].is_anchored) {
        nextAnchor = sortedTasks[i];
        break;
      }
    }
    
    if (!nextAnchor || !nextAnchor.start_date) {
      return { hasConflict: false };
    }
    
    // Calculate total duration of tasks between current task and anchor
    const tasksInBetween = sortedTasks.slice(currentIndex, sortedTasks.findIndex(t => t.id === nextAnchor!.id));
    const totalDurationDays = tasksInBetween.reduce((sum, task) => {
      const taskDays = Math.ceil((task.duration_hours || 8) / 8);
      return sum + taskDays;
    }, 0);
    
    // Check if selected date would cause collision
    const anchorStartDate = new Date(nextAnchor.start_date);
    const selectedEndDate = new Date(selectedDate);
    selectedEndDate.setDate(selectedEndDate.getDate() + totalDurationDays - 1);
    
    if (selectedEndDate >= anchorStartDate) {
      return {
        hasConflict: true,
        conflictingAnchor: {
          id: nextAnchor.id,
          title: nextAnchor.title,
          start_date: nextAnchor.start_date
        },
        message: `Moving this task to ${format(selectedDate, 'MMM d')} would create a conflict with your anchored task "${nextAnchor.title}" on ${format(anchorStartDate, 'MMM d')}.`
      };
    }
    
    return { hasConflict: false };
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (!date || !taskInfo) return;
    
    setSelectedDate(date);
    
    // Check for conflicts with this selection
    const conflicts = checkForConflicts(date, taskInfo, goalTasks);
    setConflictInfo(conflicts);
  };

  const handleProceedWithReschedule = async () => {
    if (!selectedDate || !taskId) return;
    
    setStep('processing');
    
    const result = await rescheduleTask(taskId, format(selectedDate, 'yyyy-MM-dd'));
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
    setConflictInfo({ hasConflict: false });
    setRescheduleResult(null);
    setStep('select');
    setTaskInfo(null);
    setGoalTasks([]);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) resetModal();
    onOpenChange(open);
  };

  // Simple Floor Calendar: Only disable past dates
  const isDateDisabled = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
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
            
            
            {/* Smart Interactive Warning System */}
            {conflictInfo.hasConflict && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="flex items-center gap-2 text-amber-800 mb-2">
                  <AlertTriangleIcon className="w-4 h-4" />
                  <span className="font-medium">Heads Up!</span>
                </div>
                <p className="text-sm text-amber-700 mb-3">
                  {conflictInfo.message}
                </p>
                <p className="text-xs text-amber-600 mb-3">
                  What would you like to do?
                </p>
                <div className="space-y-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-amber-700 border-amber-300 hover:bg-amber-100"
                    onClick={() => {
                      setSelectedDate(undefined);
                      setConflictInfo({ hasConflict: false });
                    }}
                  >
                    Pick a different date
                  </Button>
                  <Button
                    variant="outline" 
                    size="sm"
                    className="w-full text-amber-700 border-amber-300 hover:bg-amber-100"
                    onClick={() => {
                      // TODO: Navigate to conflicting task to un-anchor it
                      console.log('Navigate to unanchor:', conflictInfo.conflictingAnchor?.id);
                    }}
                  >
                    Un-anchor "{conflictInfo.conflictingAnchor?.title}" first
                  </Button>
                </div>
              </div>
            )}
            
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground">
                💡 {taskInfo?.is_anchored 
                  ? 'This anchored task can be moved independently without affecting other tasks.'
                  : 'Moving this floating task triggers the "Tidal Wave" - all tasks after it will shift forward to maintain the sequence.'}
              </p>
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
          
          {step === 'select' && selectedDate && !conflictInfo.hasConflict && (
            <Button onClick={handleProceedWithReschedule}>
              Reschedule to {format(selectedDate, 'MMM d')}
            </Button>
          )}
          
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