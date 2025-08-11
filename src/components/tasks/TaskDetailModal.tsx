import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
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

  useEffect(() => {
    let ignore = false;
    const load = async () => {
      if (!taskId) return;
      const { data, error } = await supabase.from('tasks').select('*').eq('id', taskId).maybeSingle();
      if (error) { toast({ title: 'Error', description: error.message }); return; }
      if (ignore || !data) return;
      setTitle(data.title || "");
      setDescription(data.description || "");
      setPriority(data.priority || undefined);
      setDuration(data.duration_hours || undefined);
      setAnchored(!!data.is_anchored);
      setStart(data.start_date ? new Date(data.start_date) : undefined);
      setEnd(data.end_date ? new Date(data.end_date) : undefined);
    };
    load();
    return () => { ignore = true; };
  }, [taskId]);

  // Debounced save
  useEffect(() => {
    const handle = setTimeout(async () => {
      if (!taskId) return;
      const payload: any = { title, description, priority };
      if (goalModality === 'project') {
        payload.duration_hours = duration ?? null;
        payload.is_anchored = anchored;
        payload.start_date = start ? format(start, 'yyyy-MM-dd') : null;
        payload.end_date = end ? format(end, 'yyyy-MM-dd') : null;
      }
      const { error } = await supabase.from('tasks').update(payload).eq('id', taskId);
      if (error) toast({ title: 'Save failed', description: error.message });
      else onSaved();
    }, 500);
    return () => clearTimeout(handle);
  }, [title, description, priority, duration, anchored, start, end, taskId]);

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
      </DialogContent>
    </Dialog>
  );
};

export default TaskDetailModal;
