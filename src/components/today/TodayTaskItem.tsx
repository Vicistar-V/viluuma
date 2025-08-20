import React, { useState, useRef, useCallback } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Clock, Calendar, Target, Sparkles, Zap, Lightbulb, CheckCircle, AlertCircle } from 'lucide-react';
import { TodayTask, useCompleteTask, useUncompleteTask } from '@/hooks/useTodayData';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { haptics } from '@/lib/haptics';
import { useMobileAnimations } from '@/hooks/useMobileAnimations';
import { useTheme } from '@/contexts/ThemeContext';

interface TodayTaskItemProps {
  task: TodayTask;
}

const TodayTaskItem: React.FC<TodayTaskItemProps> = ({ task }) => {
  const [isCompleting, setIsCompleting] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  const completeTaskMutation = useCompleteTask();
  const uncompleteTaskMutation = useUncompleteTask();
  const cardRef = useRef<HTMLDivElement>(null);
  const { handleTouchFeedback, triggerSuccessCelebration } = useMobileAnimations();
  const { actualTheme } = useTheme();

  const handleCardTouch = useCallback(() => {
    handleTouchFeedback('light');
    setIsPressed(true);
  }, [handleTouchFeedback]);

  const handleCardTouchEnd = useCallback(() => {
    setIsPressed(false);
  }, []);

  const handleCheckboxChange = async (checked: boolean) => {
    if (checked) {
      setIsCompleting(true);
      handleTouchFeedback('medium');
      try {
        await completeTaskMutation.mutateAsync(task.id);
        // Trigger celebration animation
        if (cardRef.current) {
          triggerSuccessCelebration(cardRef.current);
        }
        // Show success feedback
        toast({
          title: "Task completed! 🎉",
          description: `Great work on "${task.title}"`,
          duration: 3000,
        });
        // Animation will be handled by CSS
        setTimeout(() => setIsCompleting(false), 600);
      } catch (error) {
        setIsCompleting(false);
        toast({
          title: "Failed to complete task",
          description: "Please try again",
          variant: "destructive",
          duration: 3000,
        });
      }
    } else {
      handleTouchFeedback('light');
      uncompleteTaskMutation.mutate(task.id);
    }
  };

  const isCompleted = task.status === 'completed';
  const displayStatus = task.display_status || task.task_type;
  
  // New empathetic status checks (PRESERVED EXACTLY)
  const isOverdue = displayStatus === 'overdue';
  const isDueToday = displayStatus === 'due_today';
  const isInProgress = displayStatus === 'in_progress';
  const isStartingToday = displayStatus === 'starting_today';
  const isChecklist = displayStatus === 'checklist';

  // Get the appropriate invitation header for checklist tasks (PRESERVED)
  const getChecklistInvitation = () => {
    const invitations = [
      { icon: Sparkles, text: "✨ Feeling motivated?" },
      { icon: Zap, text: "🚀 Ready for a quick win?" },
      { icon: Lightbulb, text: "💡 Here's an idea..." }
    ];
    
    const index = parseInt(task.id.slice(-1), 16) % invitations.length;
    return invitations[index];
  };

  // Enhanced status badge with preserved color system
  const getTaskTypeDisplay = () => {
    if (isOverdue) {
      return (
        <Badge className="bg-destructive/15 text-destructive border-destructive/40 shadow-sm">
          <AlertCircle className="w-3 h-3 mr-1.5" />
          Overdue
        </Badge>
      );
    }
    
    if (isDueToday) {
      return (
        <Badge className="bg-amber-50 text-amber-700 border-amber-200 shadow-sm dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-800/40">
          <Clock className="w-3 h-3 mr-1.5" />
          Due Today
        </Badge>
      );
    }
    
    if (isInProgress) {
      return (
        <Badge className="bg-primary/15 text-primary border-primary/40 shadow-sm">
          <Target className="w-3 h-3 mr-1.5" />
          In Progress
        </Badge>
      );
    }
    
    if (isStartingToday) {
      return (
        <Badge className="bg-accent/15 text-accent-foreground border-accent/40 shadow-sm">
          <Calendar className="w-3 h-3 mr-1.5" />
          Starting Today
        </Badge>
      );
    }
    
    if (isChecklist) {
      return (
        <Badge variant="outline" className="border-dashed bg-muted/10 shadow-sm">
          <Sparkles className="w-3 h-3 mr-1.5" />
          Optional
        </Badge>
      );
    }
    
    return null;
  };

  // Enhanced priority badge
  const getPriorityDisplay = () => {
    if (!task.priority || isChecklist) return null;
    
    return (
      <Badge 
        variant="outline" 
        className={cn(
          'flex items-center gap-1.5 shadow-sm',
          task.priority === 'high' ? 'border-destructive/40 text-destructive bg-destructive/10' :
          task.priority === 'medium' ? 'border-amber-300 text-amber-700 bg-amber-50 dark:border-amber-800/40 dark:text-amber-300 dark:bg-amber-950/30' :
          'border-muted/40 text-muted-foreground bg-muted/10'
        )}
      >
        <div className={cn(
          'w-2 h-2 rounded-full',
          task.priority === 'high' ? 'bg-destructive' :
          task.priority === 'medium' ? 'bg-amber-500' :
          'bg-muted-foreground'
        )} />
        {task.priority}
      </Badge>
    );
  };

  // Get date display - preserved functionality
  const getDateDisplay = () => {
    if (!isOverdue || !task.end_date) return null;
    
    const endDate = new Date(task.end_date);
    const today = new Date();
    const diffTime = today.getTime() - endDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) {
      return 'Was due yesterday';
    } else if (diffDays > 1) {
      return `Was due ${diffDays} days ago`;
    } else {
      return `Was due ${format(endDate, 'MMM d')}`;
    }
  };

  // Get progress display - preserved functionality  
  const getProgressDisplay = () => {
    if (!isInProgress && !isDueToday && !isStartingToday) return null;
    
    if (isDueToday && task.end_date) {
      return `Due today`;
    }
    
    if (isInProgress && task.end_date) {
      const endDate = new Date(task.end_date);
      const today = new Date();
      const diffTime = endDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays === 1) {
        return `Due tomorrow`;
      } else if (diffDays > 1) {
        return `Due in ${diffDays} days`;
      }
    }
    
    return null;
  };

  // Enhanced card styling with preserved color system
  const getStatusColorAccent = () => {
    if (isCompleted) return '';
    if (isOverdue) return 'border-l-4 border-l-destructive';
    if (isDueToday) return 'border-l-4 border-l-amber-500';
    if (isInProgress) return 'border-l-4 border-l-primary';
    if (isStartingToday) return 'border-l-4 border-l-accent';
    return '';
  };

  const getStatusBackground = () => {
    if (isCompleted) return 'bg-success/8';
    if (isOverdue) return 'bg-destructive/5';
    if (isDueToday) return 'bg-amber-50/80 dark:bg-amber-950/20';
    if (isInProgress) return 'bg-primary/5';
    if (isStartingToday) return 'bg-accent/5';
    return '';
  };

  return (
    <div className="group relative">
      {/* Enhanced Mobile-Optimized Task Card */}
      <div 
        ref={cardRef}
        onTouchStart={handleCardTouch}
        onTouchEnd={handleCardTouchEnd}
        className={cn(
          "relative overflow-hidden rounded-2xl cursor-pointer will-change-transform",
          // Base theme-aware background
          "bg-card/95",
          // Enhanced border system
          "border border-border/40",
          // Color accent borders (PRESERVED SYSTEM)
          getStatusColorAccent(),
          // Status backgrounds (PRESERVED SYSTEM)  
          getStatusBackground(),
          // Theme-aware shadows
          actualTheme === 'dark' 
            ? "shadow-lg shadow-background/20" 
            : "shadow-md shadow-foreground/5",
          // Enhanced hover states
          "hover:shadow-xl hover:border-border/60 hover:bg-card",
          actualTheme === 'dark'
            ? "hover:shadow-background/30"
            : "hover:shadow-primary/10",
          // Smooth transitions
          "transition-all duration-300 cubic-bezier(0.23, 1, 0.32, 1)",
          // Press state
          isPressed && "scale-[0.98]",
          // Completing animation
          isCompleting && "animate-task-complete",
          // Completed state
          isCompleted && "ring-1 ring-success/30",
          // Enhanced padding
          "p-4"
        )}
      >
        
        {/* Dynamic theme-aware overlay */}
        <div className={cn(
          "absolute inset-0 pointer-events-none",
          actualTheme === 'dark'
            ? "bg-gradient-to-br from-primary/2 via-transparent to-accent/2"
            : "bg-gradient-to-br from-primary/1 via-transparent to-accent/1"
        )} />

        {/* Main Content */}
        <div className="relative z-10 flex items-start gap-4">
          {/* Enhanced Checkbox Section */}
          <div className="relative pt-1">
            <Checkbox
              checked={isCompleted}
              onCheckedChange={handleCheckboxChange}
              disabled={completeTaskMutation.isPending || uncompleteTaskMutation.isPending}
              className={cn(
                "data-[state=checked]:bg-success data-[state=checked]:border-success",
                "min-w-[20px] min-h-[20px] w-5 h-5",
                "border-2 shadow-sm",
                "transition-all duration-200",
                "hover:border-primary/40"
              )}
              onClick={() => {
                if (!isCompleted) {
                  haptics.light();
                }
              }}
            />
            {isCompleted && (
              <CheckCircle className="w-4 h-4 text-success absolute -top-0.5 -right-0.5 bg-background rounded-full p-0.5 shadow-sm" />
            )}
          </div>
          
          {/* Enhanced Content Section */}
          <div className="flex-1 min-w-0">
            {/* Checklist Invitation Header (PRESERVED) */}
            {isChecklist && !isCompleted && (
              <div className="mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-primary">
                    {getChecklistInvitation().text}
                  </span>
                </div>
              </div>
            )}
            
            {/* Enhanced Status and Priority Badges */}
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              {getTaskTypeDisplay()}
              {getPriorityDisplay()}
            </div>
            
            {/* Enhanced Task Title */}
            <h3 className={cn(
              'font-semibold leading-tight mb-2 transition-all duration-300',
              isCompleted ? 'line-through text-muted-foreground/70' : 'text-foreground',
              isChecklist && !isCompleted ? 'text-base' : 'text-lg'
            )}>
              {task.title}
            </h3>
            
            {/* Enhanced Task Description */}
            {task.description && (
              <p className={cn(
                'text-sm leading-relaxed mb-3 transition-all duration-300',
                isCompleted ? 'line-through text-muted-foreground/60' : 'text-muted-foreground',
                'line-clamp-2'
              )}>
                {task.description}
              </p>
            )}
            
            {/* Enhanced Info Pills */}
            <div className="flex items-center justify-between flex-wrap gap-2">
              {/* Goal Title Pill */}
              <div className={cn(
                "px-3 py-1.5 rounded-full border flex items-center gap-2",
                "bg-muted/15 border-border/30 min-h-[32px]",
                "hover:bg-muted/25 transition-colors duration-200"
              )}>
                <Target className="w-3.5 h-3.5 text-accent-foreground" />
                <span className="text-xs font-medium text-muted-foreground">
                  {task.goal_title}
                </span>
              </div>
              
              {/* Date/Status Info Pill */}
              {(getDateDisplay() || getProgressDisplay()) && (
                <div className={cn(
                  "px-3 py-1.5 rounded-full border flex items-center gap-2 min-h-[32px]",
                  "hover:bg-muted/25 transition-colors duration-200",
                  isOverdue 
                    ? "bg-destructive/10 border-destructive/30"
                    : "bg-muted/15 border-border/30"
                )}>
                  <Clock className={cn(
                    "w-3.5 h-3.5",
                    isOverdue ? "text-destructive" : "text-muted-foreground"
                  )} />
                  <span className={cn(
                    "text-xs font-medium",
                    isOverdue ? "text-destructive" : "text-muted-foreground"
                  )}>
                    {getDateDisplay() || getProgressDisplay()}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TodayTaskItem;