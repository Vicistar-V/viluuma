import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { CalendarIcon, CheckIcon, Loader2Icon, Anchor, RotateCcwIcon, TrashIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { RescheduleModal } from "./RescheduleModal";
import { DeleteTaskModal } from "./DeleteTaskModal";

interface Props {
  taskId: string | null;
  goalModality: 'project'|'checklist';
  goalStatus?: 'active' | 'archived' | 'completed';
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

const TaskDetailModal = ({ taskId, onOpenChange, goalModality, goalStatus = 'active', onSaved }: Props) => {
  const open = !!taskId;
  const { toast } = useToast();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<string | undefined>();
  const [duration, setDuration] = useState<number | undefined>();
  const [start, setStart] = useState<Date | undefined>();
  const [end, setEnd] = useState<Date | undefined>();
  const [anchored, setAnchored] = useState(false);
  
  // Save state management
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [hasChanges, setHasChanges] = useState(false);
  const [originalData, setOriginalData] = useState<any>(null);
  
  // Living Plan state
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  useEffect(() => {
    let ignore = false;
    const load = async () => {
      if (!taskId) return;
      const { data, error } = await supabase.from('tasks').select('*').eq('id', taskId).maybeSingle();
      if (error) { toast({ title: 'Error', description: error.message }); return; }
      if (ignore || !data) return;
      
      const taskData = {
        title: data.title || "",
        description: data.description || "",
        priority: data.priority || undefined,
        duration: data.duration_hours || undefined,
        anchored: !!data.is_anchored,
        start: data.start_date ? new Date(data.start_date) : undefined,
        end: data.end_date ? new Date(data.end_date) : undefined,
      };
      
      setTitle(taskData.title);
      setDescription(taskData.description);
      setPriority(taskData.priority);
      setDuration(taskData.duration);
      setAnchored(taskData.anchored);
      setStart(taskData.start);
      setEnd(taskData.end);
      setOriginalData(taskData);
      setHasChanges(false);
      setSaveState('idle');
    };
    load();
    return () => { ignore = true; };
  }, [taskId]);

  // Check for changes
  useEffect(() => {
    if (!originalData) return;
    const currentData = {
      title,
      description,
      priority,
      duration,
      anchored,
      start,
      end,
    };
    
    const changed = JSON.stringify(currentData) !== JSON.stringify(originalData);
    setHasChanges(changed);
    if (changed && saveState === 'saved') {
      setSaveState('idle');
    }
  }, [title, description, priority, duration, anchored, start, end, originalData, saveState]);

  // Manual save function
  const handleSave = async () => {
    if (!taskId || !hasChanges) return;
    
    setSaveState('saving');
    try {
      const payload: any = { title, description, priority };
      if (goalModality === 'project') {
        payload.duration_hours = duration ?? null;
        payload.is_anchored = anchored;
        payload.start_date = start ? format(start, 'yyyy-MM-dd') : null;
        payload.end_date = end ? format(end, 'yyyy-MM-dd') : null;
      }
      
      const { error } = await supabase.from('tasks').update(payload).eq('id', taskId);
      if (error) {
        toast({ title: 'Save failed', description: error.message, variant: 'destructive' });
        setSaveState('idle');
      } else {
        setSaveState('saved');
        setOriginalData({ title, description, priority, duration, anchored, start, end });
        setHasChanges(false);
        onSaved();
        
        // Reset to idle after showing saved state
        setTimeout(() => setSaveState('idle'), 2000);
      }
    } catch (error) {
      setSaveState('idle');
      toast({ title: 'Save failed', description: 'An unexpected error occurred', variant: 'destructive' });
    }
  };

  // Keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };
    
    if (open) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [open, handleSave]);


  const isReadOnly = goalStatus === 'completed';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {goalModality === 'project' ? '📅 Project Task' : '✅ Checklist Item'}
            {isReadOnly && (
              <Badge variant="outline" className="text-xs">
                Read Only
              </Badge>
            )}
          </DialogTitle>
          {goalModality === 'checklist' && (
            <p className="text-sm text-muted-foreground">
              Simple task without scheduling - complete at your own pace
            </p>
          )}
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Title</Label>
            <Input 
              value={title} 
              onChange={(e) => setTitle(e.target.value)} 
              placeholder="Task title"
              disabled={isReadOnly}
            />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea 
              value={description} 
              onChange={(e) => setDescription(e.target.value)} 
              placeholder="Details"
              disabled={isReadOnly}
            />
          </div>

          <div className="space-y-2">
            <Label>Priority</Label>
            <Select value={priority} onValueChange={setPriority} disabled={isReadOnly}>
              <SelectTrigger>
                <SelectValue placeholder="Select priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {goalModality === 'project' && (
            <>
              <div className="border-t pt-4">
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  📅 Project Timeline
                  <Badge variant="outline" className="text-xs">
                    Time-bound
                  </Badge>
                </h4>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Duration (hours)</Label>
                    <Input 
                      type="number" 
                      inputMode="numeric" 
                      value={duration ?? ''} 
                      onChange={(e) => setDuration(e.target.value ? Number(e.target.value) : undefined)}
                      disabled={isReadOnly}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Anchor className="w-3 h-3" />
                      📌 Lock this date
                    </Label>
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={anchored}
                        onCheckedChange={setAnchored}
                        disabled={isReadOnly}
                      />
                      <span className="text-sm text-muted-foreground">
                        {anchored ? 'Fixed date' : 'Flexible'}
                      </span>
                    </div>
                  </div>
                </div>
                
                {/* Date Management: Different UI based on anchor state */}
                {anchored ? (
                  // ANCHORED: User can edit start date directly
                  <div className="space-y-3 mt-3">
                    <div className="space-y-2">
                      <Label>Start Date</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button 
                            variant="outline" 
                            className={cn("w-full justify-start", !start && "text-muted-foreground")}
                            disabled={isReadOnly}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" /> 
                            {start ? format(start, 'PPP') : 'Pick a date'}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar 
                            mode="single" 
                            selected={start} 
                            onSelect={(date) => {
                              setStart(date);
                              // Auto-calculate end date based on duration
                              if (date && duration) {
                                const endDate = new Date(date);
                                endDate.setDate(endDate.getDate() + Math.ceil(duration / 8)); // Assuming 8 hours per day
                                setEnd(endDate);
                              }
                            }} 
                            className={cn("p-3 pointer-events-auto")} 
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div className="space-y-2">
                      <Label>End Date (calculated)</Label>
                      <div className="p-2 border rounded-md bg-muted/30 text-sm text-muted-foreground">
                        {end ? format(end, 'PPP') : 'Set start date and duration first'}
                      </div>
                    </div>
                  </div>
                ) : (
                  // FLOATING: Read-only dates with Reschedule button
                  <div className="space-y-3 mt-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label>Start Date</Label>
                        <div className="p-2 border rounded-md bg-muted/30 text-sm">
                          {start ? format(start, 'PPP') : 'Not scheduled'}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>End Date</Label>
                        <div className="p-2 border rounded-md bg-muted/30 text-sm">
                          {end ? format(end, 'PPP') : 'Not scheduled'}
                        </div>
                      </div>
                    </div>
                    
                    {!isReadOnly && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowRescheduleModal(true)}
                        className="w-full flex items-center gap-2"
                      >
                        <RotateCcwIcon className="w-4 h-4" />
                        Reschedule Task
                      </Button>
                    )}
                  </div>
                )}
                
                {anchored && (
                  <div className="mt-3 p-3 bg-muted/50 rounded-lg border">
                    <div className="flex items-center gap-2 text-sm">
                      <Anchor className="w-4 h-4 text-primary" />
                      <span className="font-medium">Anchored Task</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      This task's dates are fixed and won't move when other tasks are rescheduled.
                    </p>
                  </div>
                )}
                
                {/* Delete Action */}
                {!isReadOnly && goalModality === 'project' && (
                  <div className="mt-4 pt-4 border-t">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium text-sm">Task Actions</h4>
                      <Badge variant="outline" className="text-xs bg-gradient-to-r from-primary/10 to-primary/20">
                        Living Plan
                      </Badge>
                    </div>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowDeleteModal(true)}
                      className="flex items-center gap-2 text-xs text-red-600 hover:text-red-700 border-red-200 hover:border-red-300"
                    >
                      <TrashIcon className="w-3 h-3" />
                      Delete Task
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <DialogFooter className="flex-row justify-between items-center">
          <div className="text-sm text-muted-foreground">
            {isReadOnly && "Task is read-only in completed goals"}
            {!isReadOnly && hasChanges && saveState === 'idle' && "Press Ctrl+S or Save to save changes"}
            {!isReadOnly && saveState === 'saving' && "Saving changes..."}
            {!isReadOnly && saveState === 'saved' && "Changes saved successfully"}
            {!isReadOnly && !hasChanges && saveState === 'idle' && "No unsaved changes"}
          </div>
          {!isReadOnly && (
            <Button
              onClick={handleSave}
              disabled={!hasChanges || saveState === 'saving'}
              size="sm"
              className="ml-auto"
            >
              {saveState === 'saving' && <Loader2Icon className="w-4 h-4 animate-spin" />}
              {saveState === 'saved' && <CheckIcon className="w-4 h-4" />}
              {saveState === 'saving' ? 'Saving...' : saveState === 'saved' ? 'Saved' : 'Save'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
      
      {/* Living Plan Modals */}
      <RescheduleModal
        taskId={showRescheduleModal ? taskId : null}
        taskTitle={title}
        currentStartDate={start ? format(start, 'yyyy-MM-dd') : null}
        onOpenChange={setShowRescheduleModal}
        onSuccess={() => {
          onSaved();
          // Refresh task data after successful reschedule
          if (taskId) {
            setTimeout(() => {
              supabase.from('tasks').select('*').eq('id', taskId).maybeSingle()
                .then(({ data }) => {
                  if (data) {
                    setStart(data.start_date ? new Date(data.start_date) : undefined);
                    setEnd(data.end_date ? new Date(data.end_date) : undefined);
                  }
                });
            }, 500);
          }
        }}
      />
      
      <DeleteTaskModal
        taskId={showDeleteModal ? taskId : null}
        taskTitle={title}
        onOpenChange={setShowDeleteModal}
        onSuccess={() => {
          onSaved();
          onOpenChange(false); // Close the task modal since task is deleted
        }}
      />
    </Dialog>
  );
};

export default TaskDetailModal;
