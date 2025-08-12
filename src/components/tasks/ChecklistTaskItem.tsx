import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PencilLine, Trash2 } from "lucide-react";

interface Task {
  id: string;
  goal_id: string;
  milestone_id: string;
  user_id: string;
  title: string;
  description?: string | null;
  status: 'pending' | 'completed';
  priority?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  duration_hours?: number | null;
  is_anchored: boolean;
}

interface ChecklistTaskItemProps {
  task: Task;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export const ChecklistTaskItem = ({ task, onToggle, onEdit, onDelete }: ChecklistTaskItemProps) => {
  const getPriorityVariant = (priority?: string | null) => {
    switch (priority) {
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'outline';
    }
  };

  return (
    <div className={`flex items-center gap-3 p-3 rounded-lg border transition-all group ${
      task.status === 'completed' 
        ? 'bg-success/5 border-success/20' 
        : 'bg-card hover:bg-accent/50'
    }`}>
      {/* Large Checkbox */}
      <input
        type="checkbox"
        checked={task.status === 'completed'}
        onChange={onToggle}
        className="h-6 w-6 shrink-0 rounded-md border-2 transition-all"
      />
      
      {/* Task Content */}
      <div className="flex-1 min-w-0 cursor-pointer" onClick={onEdit}>
        <div className="flex items-center gap-2 mb-1">
          <h4 className={`font-medium leading-tight ${
            task.status === 'completed' ? 'line-through text-muted-foreground' : ''
          }`}>
            {task.title}
          </h4>
          
          {/* Priority Badge - simplified for checklist */}
          {task.priority && (
            <Badge 
              variant={getPriorityVariant(task.priority)}
              className="text-xs px-2 py-0"
            >
              {task.priority}
            </Badge>
          )}
          
          {/* Completion indicator */}
          {task.status === 'completed' && (
            <Badge variant="default" className="text-xs px-2 py-0 bg-success text-success-foreground">
              ✓ Done
            </Badge>
          )}
        </div>
        
        {/* Description - only if it exists */}
        {task.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {task.description}
          </p>
        )}
      </div>
      
      {/* Actions - hidden until hover */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          size="icon"
          variant="ghost"
          onClick={onEdit}
          className="h-7 w-7"
        >
          <PencilLine className="h-3 w-3" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          onClick={onDelete}
          className="h-7 w-7 text-destructive hover:text-destructive"
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
};