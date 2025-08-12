import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PencilLine, Trash2, Calendar, Clock, Anchor } from "lucide-react";
import { format } from "date-fns";

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

interface ProjectTaskItemProps {
  task: Task;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export const ProjectTaskItem = ({ task, onToggle, onEdit, onDelete }: ProjectTaskItemProps) => {
  const isOverdue = task.end_date && task.status === 'pending' && new Date(task.end_date) < new Date();
  
  const getPriorityVariant = (priority?: string | null) => {
    switch (priority) {
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'outline';
    }
  };

  const formatTaskDuration = () => {
    const parts = [];
    
    if (task.duration_hours) {
      parts.push(`${task.duration_hours}h`);
    }
    
    if (task.start_date || task.end_date) {
      if (task.start_date && task.end_date) {
        const start = format(new Date(task.start_date), 'MMM dd');
        const end = format(new Date(task.end_date), 'MMM dd');
        parts.push(`${start} - ${end}`);
      } else if (task.start_date) {
        parts.push(`Starts ${format(new Date(task.start_date), 'MMM dd')}`);
      } else if (task.end_date) {
        parts.push(`Due ${format(new Date(task.end_date), 'MMM dd')}`);
      }
    }
    
    return parts.join(' • ');
  };

  return (
    <div className={`flex items-start gap-3 p-3 rounded-lg border transition-all group ${
      task.status === 'completed' 
        ? 'bg-muted/50 opacity-75' 
        : isOverdue
        ? 'bg-destructive/5 border-destructive/20 overdue-glow'
        : 'bg-card hover:bg-muted/30'
    }`}>
      {/* Checkbox */}
      <input
        type="checkbox"
        checked={task.status === 'completed'}
        onChange={onToggle}
        className="h-5 w-5 shrink-0 mt-0.5 rounded border-2 transition-colors"
      />
      
      {/* Task Content */}
      <div className="flex-1 min-w-0 cursor-pointer" onClick={onEdit}>
        <div className="flex items-center gap-2 mb-1">
          <h4 className={`font-medium leading-tight ${
            task.status === 'completed' ? 'line-through text-muted-foreground' : ''
          }`}>
            {task.title}
          </h4>
          
          {/* Priority Badge */}
          {task.priority && (
            <Badge 
              variant={getPriorityVariant(task.priority)}
              className="text-xs px-1.5 py-0"
            >
              {task.priority}
            </Badge>
          )}
          
          {/* Anchored Badge */}
          {task.is_anchored && (
            <Badge variant="outline" className="text-xs px-1.5 py-0">
              <Anchor className="w-3 h-3 mr-0.5" />
              Anchored
            </Badge>
          )}
          
          {/* Overdue Indicator */}
          {isOverdue && (
            <Badge variant="destructive" className="text-xs px-1.5 py-0">
              Overdue
            </Badge>
          )}
        </div>
        
        {/* Description */}
        {task.description && (
          <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
            {task.description}
          </p>
        )}
        
        {/* Timeline Info */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {formatTaskDuration() && (
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>{formatTaskDuration()}</span>
            </div>
          )}
        </div>
      </div>
      
      {/* Actions */}
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