import React, { useState } from 'react';
import { format, isValid, parseISO } from 'date-fns';
import { 
  Accordion, 
  AccordionContent, 
  AccordionItem, 
  AccordionTrigger 
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Plus, 
  PencilLine, 
  Trash2, 
  Calendar, 
  Clock, 
  Anchor,
  Target,
  CheckCircle,
  AlertCircle,
  MoreHorizontal
} from "lucide-react";
import { cn } from "@/lib/utils";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

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

interface MobileActiveProjectViewProps {
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

const MobileActiveProjectView: React.FC<MobileActiveProjectViewProps> = ({
  milestones,
  groupedTasks,
  onMilestoneEdit,
  onMilestoneDelete,
  onTaskToggle,
  onTaskEdit,
  onTaskDelete,
  onAddTask,
  onAddMilestone,
}) => {
  const [editingMilestone, setEditingMilestone] = useState<string | null>(null);
  const [milestoneTitle, setMilestoneTitle] = useState('');

  const handleMilestoneEdit = async (milestone: Milestone, newTitle: string) => {
    await onMilestoneEdit(milestone, newTitle);
    setEditingMilestone(null);
  };

  const getMilestoneStatus = (milestone: Milestone) => {
    const progress = milestone.total_tasks > 0 ? (milestone.completed_tasks / milestone.total_tasks) * 100 : 0;
    if (progress === 100) {
      return {
        variant: "success" as const,
        bgClass: "bg-gradient-to-br from-success/10 to-success/5",
        borderClass: "border-success/20",
        icon: CheckCircle,
        label: "Complete"
      };
    } else if (progress > 0) {
      return {
        variant: "progress" as const,
        bgClass: "bg-gradient-to-br from-primary/10 to-blue-500/5",
        borderClass: "border-primary/20",
        icon: Target,
        label: `${Math.round(progress)}%`
      };
    } else {
      return {
        variant: "pending" as const,
        bgClass: "bg-gradient-to-br from-muted/20 to-muted/5",
        borderClass: "border-muted/30",
        icon: AlertCircle,
        label: "Not Started"
      };
    }
  };

  const getTaskDateInfo = (task: Task) => {
    if (!task.start_date) return null;
    
    const startDate = parseISO(task.start_date);
    if (!isValid(startDate)) return null;
    
    return format(startDate, 'MMM d');
  };

  const TaskItem: React.FC<{ task: Task }> = ({ task }) => (
    <div className={cn(
      "group flex items-center gap-3 p-3 rounded-xl transition-all duration-200",
      "hover:bg-muted/30 border border-transparent hover:border-muted/50",
      task.status === 'completed' && "opacity-60"
    )}>
      <Checkbox
        checked={task.status === 'completed'}
        onCheckedChange={() => onTaskToggle(task)}
        className="shrink-0"
      />
      
      <div 
        className="flex-1 min-w-0 cursor-pointer"
        onClick={() => onTaskEdit(task.id)}
      >
        <div className="flex items-center gap-2 mb-1">
          <h4 className={cn(
            "font-medium text-foreground truncate",
            task.status === 'completed' && "line-through text-muted-foreground"
          )}>
            {task.title}
          </h4>
          {task.is_anchored && (
            <Anchor className="w-3 h-3 text-primary shrink-0" />
          )}
        </div>
        
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {getTaskDateInfo(task) && (
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {getTaskDateInfo(task)}
            </div>
          )}
          {task.duration_hours && (
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {task.duration_hours}h
            </div>
          )}
          {task.priority && (
            <Badge variant="outline" className="h-4 px-1 text-xs rounded">
              {task.priority}
            </Badge>
          )}
        </div>
      </div>
      
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 opacity-0 group-hover:opacity-60 hover:opacity-100 transition-opacity shrink-0"
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-32 rounded-xl">
          <DropdownMenuItem onClick={() => onTaskEdit(task.id)}>
            <PencilLine className="w-4 h-4 mr-2" />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem 
            onClick={() => onTaskDelete(task)}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Add Milestone Button */}
      <Card className="rounded-2xl bg-gradient-to-br from-primary/5 to-accent/5 border-primary/20">
        <CardContent className="p-4">
          <Button
            onClick={onAddMilestone}
            variant="ghost"
            className="w-full h-12 rounded-xl border-2 border-dashed border-primary/30 text-primary hover:bg-primary/10"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add New Milestone
          </Button>
        </CardContent>
      </Card>

      {/* Milestones */}
      {milestones.length > 0 ? (
        <Accordion type="multiple" className="space-y-4">
          {milestones.map((milestone, index) => {
            const status = getMilestoneStatus(milestone);
            const tasks = groupedTasks[milestone.id] || [];
            
            return (
              <AccordionItem 
                key={milestone.id} 
                value={milestone.id} 
                className="border-none"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <Card className={cn(
                  "rounded-2xl transition-all duration-300 animate-fade-in",
                  status.bgClass,
                  status.borderClass
                )}>
                  <AccordionTrigger className="hover:no-underline p-0">
                    <CardContent className="p-4 w-full">
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className={cn(
                            "flex items-center justify-center w-10 h-10 rounded-full shrink-0",
                            status.variant === "success" && "bg-success/20",
                            status.variant === "progress" && "bg-primary/20",
                            status.variant === "pending" && "bg-muted/30"
                          )}>
                            <status.icon className={cn(
                              "w-5 h-5",
                              status.variant === "success" && "text-success",
                              status.variant === "progress" && "text-primary",
                              status.variant === "pending" && "text-muted-foreground"
                            )} />
                          </div>
                          
                          <div className="flex-1 min-w-0 text-left">
                            {editingMilestone === milestone.id ? (
                              <Input
                                value={milestoneTitle}
                                onChange={(e) => setMilestoneTitle(e.target.value)}
                                onBlur={() => handleMilestoneEdit(milestone, milestoneTitle)}
                                onKeyDown={(e) => {
                                  e.stopPropagation();
                                  if (e.key === 'Enter') handleMilestoneEdit(milestone, milestoneTitle);
                                  if (e.key === 'Escape') setEditingMilestone(null);
                                }}
                                className="h-auto border-none px-0 bg-transparent focus-visible:ring-0 font-semibold"
                                autoFocus
                                onClick={(e) => e.stopPropagation()}
                              />
                            ) : (
                              <div 
                                className="group/title flex items-center gap-2"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setMilestoneTitle(milestone.title);
                                  setEditingMilestone(milestone.id);
                                }}
                              >
                                <h3 className="font-semibold text-foreground truncate">
                                  {milestone.title}
                                </h3>
                                <PencilLine className="w-3 h-3 opacity-0 group-hover/title:opacity-60 transition-opacity shrink-0" />
                              </div>
                            )}
                            
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className="h-5 px-2 text-xs rounded-full">
                                {status.label}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {milestone.completed_tasks} / {milestone.total_tasks} tasks
                              </span>
                            </div>
                          </div>
                        </div>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 opacity-60 hover:opacity-100 shrink-0"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-40 rounded-xl">
                            <DropdownMenuItem 
                              onClick={(e) => {
                                e.stopPropagation();
                                setMilestoneTitle(milestone.title);
                                setEditingMilestone(milestone.id);
                              }}
                            >
                              <PencilLine className="w-4 h-4 mr-2" />
                              Edit Name
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={(e) => {
                                e.stopPropagation();
                                onAddTask(milestone.id);
                              }}
                            >
                              <Plus className="w-4 h-4 mr-2" />
                              Add Task
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={(e) => {
                                e.stopPropagation();
                                onMilestoneDelete(milestone.id);
                              }}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardContent>
                  </AccordionTrigger>

                  <AccordionContent className="pb-4 px-4">
                    <div className="space-y-2">
                      {tasks.map((task) => (
                        <TaskItem key={task.id} task={task} />
                      ))}
                      
                      {/* Add Task Button */}
                      <Button
                        onClick={() => onAddTask(milestone.id)}
                        variant="ghost"
                        className="w-full h-10 rounded-xl border border-dashed border-muted-foreground/30 text-muted-foreground hover:text-foreground hover:border-muted-foreground/50"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Task
                      </Button>
                    </div>
                  </AccordionContent>
                </Card>
              </AccordionItem>
            );
          })}
        </Accordion>
      ) : (
        <Card className="rounded-2xl animate-scale-in">
          <CardContent className="p-8 text-center">
            <div className="flex flex-col items-center gap-4">
              <div className="p-4 bg-gradient-to-br from-primary/10 to-accent/10 rounded-full">
                <Target className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-2">Ready to plan your project?</h3>
                <p className="text-muted-foreground text-sm mb-4">
                  Break down your goal into milestones and tasks to track your progress.
                </p>
                <Button onClick={onAddMilestone} className="rounded-full">
                  <Plus className="mr-2 h-4 w-4" />
                  Create First Milestone
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default MobileActiveProjectView;