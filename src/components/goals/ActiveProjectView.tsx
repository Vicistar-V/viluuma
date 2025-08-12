import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, PencilLine, Trash2, Calendar, Clock, Anchor } from "lucide-react";
import { useState } from "react";
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

interface Milestone {
  id: string;
  goal_id: string;
  title: string;
  status: string;
  order_index: number | null;
  total_tasks: number;
  completed_tasks: number;
}

interface ActiveProjectViewProps {
  milestones: Milestone[];
  groupedTasks: Record<string, Task[]>;
  onMilestoneEdit: (milestone: Milestone, newTitle: string) => Promise<void>;
  onMilestoneDelete: (milestoneId: string) => Promise<void>;
  onTaskToggle: (task: Task) => Promise<void>;
  onTaskEdit: (taskId: string) => void;
  onTaskDelete: (task: Task) => Promise<void>;
  onAddTask: (milestoneId: string) => Promise<void>;
  onAddMilestone: () => Promise<void>;
}

export const ActiveProjectView = ({
  milestones,
  groupedTasks,
  onMilestoneEdit,
  onMilestoneDelete,
  onTaskToggle,
  onTaskEdit,
  onTaskDelete,
  onAddTask,
  onAddMilestone
}: ActiveProjectViewProps) => {
  const [editingMilestoneId, setEditingMilestoneId] = useState<string | null>(null);

  const handleMilestoneSave = async (milestone: Milestone, title: string) => {
    if (title.trim() && title !== milestone.title) {
      await onMilestoneEdit(milestone, title.trim());
    }
    setEditingMilestoneId(null);
  };

  const getPriorityVariant = (priority?: string | null) => {
    switch (priority) {
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'outline';
    }
  };

  const formatTaskDuration = (task: Task) => {
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

  const isTaskOverdue = (task: Task) => {
    if (!task.end_date || task.status === 'completed') return false;
    return new Date(task.end_date) < new Date();
  };

  return (
    <div className="space-y-4">
      {/* Header with Add Milestone */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Project Timeline</h2>
        <Button size="sm" onClick={onAddMilestone}>
          <Plus className="mr-1 h-4 w-4" />
          Add Milestone
        </Button>
      </div>

      {/* Milestones Accordion */}
      <Accordion type="multiple" className="space-y-3">
        {milestones.map((milestone) => {
          const milestoneTasks = groupedTasks[milestone.id] || [];
          const completionRate = milestone.total_tasks > 0 
            ? Math.round((milestone.completed_tasks / milestone.total_tasks) * 100) 
            : 0;

          return (
            <AccordionItem 
              key={milestone.id} 
              value={milestone.id} 
              className="border rounded-lg bg-card"
            >
              <AccordionTrigger className="px-4 py-3 hover:no-underline">
                <div className="w-full flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {editingMilestoneId === milestone.id ? (
                      <Input
                        defaultValue={milestone.title}
                        autoFocus
                        onBlur={(e) => handleMilestoneSave(milestone, e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                          if (e.key === 'Escape') setEditingMilestoneId(null);
                        }}
                        className="h-8 bg-background"
                        onClick={(e) => e.stopPropagation()}
                      />
                    ) : (
                      <div className="text-left flex-1 min-w-0">
                        <div className="font-medium truncate">{milestone.title}</div>
                        <div className="text-xs text-muted-foreground flex items-center gap-2">
                          <span>{milestone.completed_tasks} / {milestone.total_tasks} tasks</span>
                          <span>•</span>
                          <span>{completionRate}% complete</span>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingMilestoneId(milestone.id);
                      }}
                      className="h-8 w-8"
                    >
                      <PencilLine className="h-3 w-3" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        onMilestoneDelete(milestone.id);
                      }}
                      className="h-8 w-8 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </AccordionTrigger>
              
              <AccordionContent className="px-4 pb-4">
                <div className="space-y-3">
                  {milestoneTasks.map((task) => (
                    <div
                      key={task.id}
                      className={`flex items-start gap-3 p-3 rounded-lg border transition-all ${
                        task.status === 'completed' 
                          ? 'bg-muted/50 opacity-75' 
                          : isTaskOverdue(task)
                          ? 'bg-destructive/5 border-destructive/20'
                          : 'bg-card hover:bg-muted/30'
                      }`}
                    >
                      {/* Checkbox */}
                      <input
                        type="checkbox"
                        checked={task.status === 'completed'}
                        onChange={() => onTaskToggle(task)}
                        className="h-5 w-5 shrink-0 mt-0.5 rounded border-2 transition-colors"
                      />
                      
                      {/* Task Content */}
                      <div 
                        className="flex-1 min-w-0 cursor-pointer"
                        onClick={() => onTaskEdit(task.id)}
                      >
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
                          {isTaskOverdue(task) && (
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
                          {formatTaskDuration(task) && (
                            <div className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              <span>{formatTaskDuration(task)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Actions */}
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => onTaskEdit(task.id)}
                          className="h-7 w-7"
                        >
                          <PencilLine className="h-3 w-3" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => onTaskDelete(task)}
                          className="h-7 w-7 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  
                  {/* Add Task Button */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onAddTask(milestone.id)}
                    className="w-full border-dashed"
                  >
                    <Plus className="mr-1 h-4 w-4" />
                    Add Task
                  </Button>
                </div>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
      
      {milestones.length === 0 && (
        <div className="text-center py-12">
          <div className="text-muted-foreground mb-4">
            No milestones yet. Get started by adding your first milestone.
          </div>
          <Button onClick={onAddMilestone}>
            <Plus className="mr-1 h-4 w-4" />
            Add First Milestone
          </Button>
        </div>
      )}
    </div>
  );
};