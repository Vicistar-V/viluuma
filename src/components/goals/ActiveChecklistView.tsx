import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, PencilLine, Trash2, CheckCircle2 } from "lucide-react";
import { useState } from "react";

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

interface ActiveChecklistViewProps {
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

export const ActiveChecklistView = ({
  milestones,
  groupedTasks,
  onMilestoneEdit,
  onMilestoneDelete,
  onTaskToggle,
  onTaskEdit,
  onTaskDelete,
  onAddTask,
  onAddMilestone
}: ActiveChecklistViewProps) => {
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

  return (
    <div className="space-y-4">
      {/* Header with Add Milestone */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Checklist Items</h2>
        <Button size="sm" onClick={onAddMilestone}>
          <Plus className="mr-1 h-4 w-4" />
          Add Section
        </Button>
      </div>

      {/* Simple description */}
      <div className="text-sm text-muted-foreground bg-muted/30 rounded-lg p-3 border-l-4 border-l-primary/50">
        ✅ This is a flexible checklist. Complete tasks at your own pace without time pressure.
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
              className="border rounded-lg bg-card checklist-card"
            >
              <AccordionTrigger className="px-4 py-3 hover:no-underline">
                <div className="w-full flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {milestone.status === 'completed' && (
                      <CheckCircle2 className="h-5 w-5 text-success shrink-0" />
                    )}
                    
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
                        <div className={`font-medium truncate ${
                          milestone.status === 'completed' ? 'line-through text-muted-foreground' : ''
                        }`}>
                          {milestone.title}
                        </div>
                        <div className="text-xs text-muted-foreground flex items-center gap-2">
                          <span>{milestone.completed_tasks} / {milestone.total_tasks} completed</span>
                          {completionRate === 100 && (
                            <>
                              <span>•</span>
                              <span className="text-success font-medium">✓ Complete</span>
                            </>
                          )}
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
                <div className="space-y-2">
                  {milestoneTasks.map((task) => (
                    <div
                      key={task.id}
                      className={`flex items-center gap-3 p-3 rounded-lg border transition-all group ${
                        task.status === 'completed' 
                          ? 'bg-success/5 border-success/20' 
                          : 'bg-card hover:bg-accent/50'
                      }`}
                    >
                      {/* Large Checkbox */}
                      <input
                        type="checkbox"
                        checked={task.status === 'completed'}
                        onChange={() => onTaskToggle(task)}
                        className="h-6 w-6 shrink-0 rounded-md border-2 transition-all"
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
                    className="w-full border-dashed bg-background/50 hover:bg-accent/50"
                  >
                    <Plus className="mr-1 h-4 w-4" />
                    Add Item
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
            No sections yet. Create your first section to organize your checklist.
          </div>
          <Button onClick={onAddMilestone}>
            <Plus className="mr-1 h-4 w-4" />
            Add First Section
          </Button>
        </div>
      )}
    </div>
  );
};