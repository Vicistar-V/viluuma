import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TrashIcon, AlertTriangleIcon, CheckCircleIcon, Loader2Icon, ClockIcon } from 'lucide-react';
import { useLivingPlan } from '@/hooks/useLivingPlan';

interface Props {
  taskId: string | null;
  taskTitle: string;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const DeleteTaskModal = ({ taskId, taskTitle, onOpenChange, onSuccess }: Props) => {
  const open = !!taskId;
  const [deleteResult, setDeleteResult] = useState<any>(null);
  const [step, setStep] = useState<'confirm' | 'preview' | 'processing'>('confirm');
  
  const { isProcessing, deleteAndRefactor, commitPlanUpdate } = useLivingPlan();

  const handleCalculateImpact = async () => {
    if (!taskId) return;
    
    setStep('processing');
    const result = await deleteAndRefactor(taskId);
    setDeleteResult(result);
    setStep('preview');
  };

  const handleConfirmDelete = async () => {
    if (!deleteResult || deleteResult.status === 'error') return;
    
    setStep('processing');
    const success = await commitPlanUpdate(deleteResult.updatedTasks, taskId);
    
    if (success) {
      onSuccess();
      onOpenChange(false);
      resetModal();
    } else {
      setStep('preview');
    }
  };

  const resetModal = () => {
    setDeleteResult(null);
    setStep('confirm');
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) resetModal();
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrashIcon className="w-5 h-5 text-red-500" />
            Delete Task
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            {taskTitle}
          </p>
        </DialogHeader>

        {step === 'confirm' && (
          <div className="space-y-4">
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center gap-2 text-red-800 mb-2">
                <AlertTriangleIcon className="w-4 h-4" />
                <span className="font-medium">This action cannot be undone</span>
              </div>
              <p className="text-sm text-red-700">
                Deleting this task will permanently remove it and automatically reschedule 
                any tasks that come after it.
              </p>
            </div>
            
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground">
                💡 Want to see exactly how this will affect your schedule? 
                Click "Preview Impact" to see what changes before confirming.
              </p>
            </div>
          </div>
        )}

        {step === 'processing' && (
          <div className="flex items-center justify-center py-8">
            <div className="text-center space-y-3">
              <Loader2Icon className="w-8 h-8 animate-spin mx-auto text-primary" />
              <p className="text-sm text-muted-foreground">
                {deleteResult ? 'Deleting task...' : 'Calculating impact...'}
              </p>
            </div>
          </div>
        )}

        {step === 'preview' && deleteResult && (
          <div className="space-y-4">
            {deleteResult.status === 'success' && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                <div className="flex items-center gap-2 text-emerald-800 mb-2">
                  <CheckCircleIcon className="w-4 h-4" />
                  <span className="font-medium">Ready to Delete</span>
                </div>
                <p className="text-sm text-emerald-700">
                  {deleteResult.message}
                </p>
                
                {deleteResult.timeSavedInDays > 0 && (
                  <div className="mt-2 flex items-center gap-2">
                    <ClockIcon className="w-4 h-4 text-emerald-600" />
                    <span className="text-sm text-emerald-700">
                      Time saved: {deleteResult.timeSavedInDays} day{deleteResult.timeSavedInDays !== 1 ? 's' : ''}
                    </span>
                  </div>
                )}

                {deleteResult.anchoredBarriers && deleteResult.anchoredBarriers.length > 0 && (
                  <div className="mt-2">
                    <p className="text-xs text-emerald-600 mb-1">Anchored tasks that will remain fixed:</p>
                    <div className="space-y-1">
                      {deleteResult.anchoredBarriers.map((barrier: any) => (
                        <Badge key={barrier.id} variant="outline" className="text-xs">
                          📌 {barrier.title}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {deleteResult.status === 'dependency_conflict' && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="flex items-center gap-2 text-amber-800 mb-2">
                  <AlertTriangleIcon className="w-4 h-4" />
                  <span className="font-medium">Scheduling Conflicts Detected</span>
                </div>
                <p className="text-sm text-amber-700">
                  {deleteResult.message}
                </p>
                {deleteResult.dependencyIssues && (
                  <div className="mt-2">
                    <p className="text-xs text-amber-600 mb-1">Issues found:</p>
                    <ul className="text-xs text-amber-700 space-y-1">
                      {deleteResult.dependencyIssues.map((issue: string, index: number) => (
                        <li key={index}>• {issue}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {deleteResult.status === 'error' && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center gap-2 text-red-800 mb-2">
                  <AlertTriangleIcon className="w-4 h-4" />
                  <span className="font-medium">Delete Failed</span>
                </div>
                <p className="text-sm text-red-700">
                  {deleteResult.error || 'An error occurred while calculating the impact'}
                </p>
              </div>
            )}
          </div>
        )}

        <DialogFooter className="flex-row justify-between">
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          
          <div className="space-x-2">
            {step === 'confirm' && (
              <>
                <Button variant="outline" onClick={handleCalculateImpact} disabled={isProcessing}>
                  Preview Impact
                </Button>
                <Button variant="destructive" onClick={handleCalculateImpact} disabled={isProcessing}>
                  {isProcessing && <Loader2Icon className="w-4 h-4 animate-spin mr-2" />}
                  Delete Task
                </Button>
              </>
            )}
            
            {step === 'preview' && deleteResult?.status !== 'error' && (
              <Button
                variant="destructive"
                onClick={handleConfirmDelete}
                disabled={isProcessing}
              >
                {isProcessing && <Loader2Icon className="w-4 h-4 animate-spin mr-2" />}
                {deleteResult.status === 'dependency_conflict' ? 'Delete Anyway' : 'Confirm Delete'}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};