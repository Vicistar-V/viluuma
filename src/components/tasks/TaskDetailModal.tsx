import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, CheckIcon, Loader2Icon } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Props {
  taskId: string | null;
  goalModality: 'project'|'checklist';
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

const TaskDetailModal = ({ taskId, onOpenChange, goalModality, onSaved }: Props) => {
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

  // Light auto-save backup (3 seconds)
  useEffect(() => {
    if (!hasChanges || saveState === 'saving') return;
    
    const handle = setTimeout(() => {
      handleSave();
    }, 3000);
    
    return () => clearTimeout(handle);
  }, [hasChanges, saveState, handleSave]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Task</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Task title" />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Details" />
          </div>

          <div className="space-y-2">
            <Label>Priority</Label>
            <Select value={priority} onValueChange={setPriority}>
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
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Duration (hours)</Label>
                <Input type="number" inputMode="numeric" value={duration ?? ''} onChange={(e) => setDuration(e.target.value ? Number(e.target.value) : undefined)} />
              </div>
              <div className="space-y-2">
                <Label>Anchored?</Label>
                <Button variant={anchored ? 'default' : 'outline'} onClick={() => setAnchored((a) => !a)}>
                  {anchored ? 'Anchored' : 'Flexible'}
                </Button>
              </div>
              <div className="col-span-2 grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Start</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("w-full justify-start", !start && "text-muted-foreground")}>
                        <CalendarIcon className="mr-2 h-4 w-4" /> {start ? format(start, 'PPP') : 'Pick a date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={start} onSelect={setStart} className={cn("p-3 pointer-events-auto")} />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <Label>End</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("w-full justify-start", !end && "text-muted-foreground")}>
                        <CalendarIcon className="mr-2 h-4 w-4" /> {end ? format(end, 'PPP') : 'Pick a date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={end} onSelect={setEnd} className={cn("p-3 pointer-events-auto")} />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex-row justify-between items-center">
          <div className="text-sm text-muted-foreground">
            {hasChanges && saveState === 'idle' && "Press Ctrl+S or Save to save changes"}
            {saveState === 'saving' && "Saving changes..."}
            {saveState === 'saved' && "Changes saved successfully"}
            {!hasChanges && saveState === 'idle' && "No unsaved changes"}
          </div>
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
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TaskDetailModal;
