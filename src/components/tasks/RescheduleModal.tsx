import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { CalendarIcon, AlertTriangleIcon, CheckCircleIcon, Loader2Icon } from 'lucide-react';
import { format, addDays } from 'date-fns';
import { useLivingPlan } from '@/hooks/useLivingPlan';

interface Props {
  taskId: string | null;
  taskTitle: string;
  currentStartDate: string | null;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const RescheduleModal = ({ taskId, taskTitle, currentStartDate, onOpenChange, onSuccess }: Props) => {
  const open = !!taskId;
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [rescheduleResult, setRescheduleResult] = useState<any>(null);
  const [step, setStep] = useState<'select' | 'preview' | 'processing'>('select');
  
  const { isProcessing, rescheduleTask, commitPlanUpdate } = useLivingPlan();

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
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) resetModal();
    onOpenChange(open);
  };

  const today = new Date();
  const minDate = addDays(today, 1); // Can't schedule for today or past

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
            <div className="text-sm">
              <p className="font-medium">Current start date:</p>
              <p className="text-muted-foreground">
                {currentStartDate ? format(new Date(currentStartDate), 'PPP') : 'Not scheduled'}
              </p>
            </div>
            
            <div>
              <p className="text-sm font-medium mb-2">Select new start date:</p>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={handleDateSelect}
                disabled={(date) => date < minDate}
                className="rounded-md border"
              />
            </div>
            
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground">
                💡 Moving this task will automatically reschedule all tasks that come after it, 
                unless they are anchored with 📌.
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