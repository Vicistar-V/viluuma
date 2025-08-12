import React, { useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Clock, Calendar, Target, Sparkles, Zap, Lightbulb } from 'lucide-react';
import { TodayTask, useCompleteTask, useUncompleteTask } from '@/hooks/useTodayData';
import { format, isToday, isPast } from 'date-fns';
import { cn } from '@/lib/utils';

interface TodayTaskItemProps {
  task: TodayTask;
}

const TodayTaskItem: React.FC<TodayTaskItemProps> = ({ task }) => {
  const [isCompleting, setIsCompleting] = useState(false);
  const completeTaskMutation = useCompleteTask();
  const uncompleteTaskMutation = useUncompleteTask();

  const handleCheckboxChange = async (checked: boolean) => {
    if (checked) {
      setIsCompleting(true);
      await completeTaskMutation.mutateAsync(task.id);
      // Animation will be handled by CSS
      setTimeout(() => setIsCompleting(false), 600);
    } else {
      uncompleteTaskMutation.mutate(task.id);
    }
  };

  const isCompleted = task.status === 'completed';
  const isOverdue = task.task_type === 'overdue';
  const isChecklist = task.task_type === 'checklist';
  const isScheduled = task.task_type === 'scheduled';

  // Priority indicator component
  const PriorityIndicator = () => {
    if (!task.priority || isChecklist) return null;
    
    const priorityClasses = {
      high: 'priority-indicator-high',
      medium: 'priority-indicator-medium',
      low: 'priority-indicator-low'
    };
    
    return (
      <div className={cn(
        'w-2 h-2 rounded-full flex-shrink-0',
        priorityClasses[task.priority as keyof typeof priorityClasses]
      )} />
    );
  };

  // Get the appropriate invitation header for checklist tasks
  const getChecklistInvitation = () => {
    const invitations = [
      { icon: Sparkles, text: "✨ Feeling motivated?" },
      { icon: Zap, text: "🚀 Ready for a quick win?" },
      { icon: Lightbulb, text: "💡 Here's an idea..." }
    ];
    
    // Use task ID to consistently pick the same invitation
    const index = parseInt(task.id.slice(-1), 16) % invitations.length;
    return invitations[index];
  };

  // Get date display for overdue tasks
  const getOverdueDisplay = () => {
    if (!isOverdue || !task.start_date) return null;
    
    const startDate = new Date(task.start_date);
    if (isToday(startDate)) {
      return 'Due today';
    } else {
      return `Was due ${format(startDate, 'MMM d')}`;
    }
  };

  // Get duration or end date display for scheduled tasks
  const getScheduledDisplay = () => {
    if (!isScheduled || !task.end_date) return null;
    
    const endDate = new Date(task.end_date);
    const startDate = task.start_date ? new Date(task.start_date) : new Date();
    
    // Calculate duration in days
    const diffTime = endDate.getTime() - startDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) {
      return '1 day';
    } else if (diffDays > 1) {
      return `${diffDays} days`;
    } else {
      return format(endDate, 'MMM d');
    }
  };

  // Card styling based on task type
  const getCardClassName = () => {
    const baseClasses = 'transition-all duration-200 hover:shadow-md task-card-enter';
    
    if (isCompleting) {
      return cn(baseClasses, 'animate-task-complete');
    }
    
    if (isCompleted) {
      return cn(baseClasses, 'opacity-60');
    }
    
    if (isChecklist) {
      return cn(baseClasses, 'checklist-card');
    }
    
    if (isOverdue) {
      return cn(baseClasses, 'overdue-glow');
    }
    
    // Scheduled tasks - clean standard design
    return cn(baseClasses, 'border-l-4 border-l-primary/20 hover:border-l-primary/40');
  };

  return (
    <Card className={getCardClassName()}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Checkbox
            checked={isCompleted}
            onCheckedChange={handleCheckboxChange}
            disabled={completeTaskMutation.isPending || uncompleteTaskMutation.isPending}
            className="mt-1 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
          />
          
          <div className="flex-1 min-w-0">
            {/* Checklist Invitation Header */}
            {isChecklist && !isCompleted && (
              <div className="mb-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-medium text-primary">
                    {getChecklistInvitation().text}
                  </span>
                </div>
              </div>
            )}
            
            {/* Task Type and Priority Badges */}
            <div className="flex items-center gap-2 mb-2">
              {/* Task Type Badge */}
              {isOverdue && (
                <Badge variant="secondary" className="text-xs border-warning text-warning">
                  <Clock className="w-3 h-3 mr-1" />
                  Overdue
                </Badge>
              )}
              
              {isScheduled && (
                <Badge variant="secondary" className="text-xs">
                  <Calendar className="w-3 h-3 mr-1" />
                  Today
                </Badge>
              )}
              
              {isChecklist && (
                <Badge variant="outline" className="text-xs border-dashed">
                  <Target className="w-3 h-3 mr-1" />
                  Optional
                </Badge>
              )}
              
              {/* Priority Badge (not for checklist) */}
              {!isChecklist && task.priority && (
                <Badge 
                  variant="outline" 
                  className={cn(
                    'text-xs flex items-center gap-1',
                    task.priority === 'high' ? 'border-destructive text-destructive' :
                    task.priority === 'medium' ? 'border-warning text-warning' :
                    'border-muted-foreground text-muted-foreground'
                  )}
                >
                  <PriorityIndicator />
                  {task.priority}
                </Badge>
              )}
            </div>
            
            {/* Task Title */}
            <h3 className={cn(
              'font-medium mb-1',
              isCompleted ? 'line-through text-muted-foreground' : 'text-foreground',
              isChecklist && !isCompleted ? 'text-sm' : 'text-base'
            )}>
              {task.title}
            </h3>
            
            {/* Task Description */}
            {task.description && (
              <p className={cn(
                'text-sm mb-2',
                isCompleted ? 'line-through text-muted-foreground' : 'text-muted-foreground'
              )}>
                {task.description}
              </p>
            )}
            
            {/* Bottom Row: Goal Title and Date Info */}
            <div className="flex items-center justify-between">
              {/* Goal Title */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground font-medium">
                  {task.goal_title}
                </span>
                {isChecklist && (
                  <Badge variant="outline" className="text-xs border-dashed text-muted-foreground">
                    Checklist
                  </Badge>
                )}
              </div>
              
              {/* Date Information */}
              <div className="flex items-center gap-2">
                {isOverdue && (
                  <span className="text-xs text-warning font-medium">
                    {getOverdueDisplay()}
                  </span>
                )}
                
                {isScheduled && (
                  <span className="text-xs text-muted-foreground">
                    {getScheduledDisplay()}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default TodayTaskItem;