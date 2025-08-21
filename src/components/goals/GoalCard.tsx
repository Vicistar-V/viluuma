import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Calendar, Clock, MoreVertical, Target, CheckCircle, Archive, Trash2, RotateCcw, Layers3, ListChecks, Sparkles, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Goal } from '@/hooks/useGoals';
import { useState, useEffect, useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { useMobileAnimations } from '@/hooks/useMobileAnimations';
import { useTheme } from '@/contexts/ThemeContext';

interface GoalCardProps {
  goal: Goal;
  onStatusChange: (goalId: string, status: 'active' | 'archived' | 'completed') => void;
  onReopenGoal?: (goalId: string) => void;
  onDelete: (goalId: string) => void;
}

export const GoalCard = ({ goal, onStatusChange, onReopenGoal, onDelete }: GoalCardProps) => {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const { triggerSuccessCelebration, animateProgressBar } = useMobileAnimations();
  const { actualTheme } = useTheme();
  
  const progress = goal.total_tasks > 0 ? (goal.completed_tasks / goal.total_tasks) * 100 : 0;
  
  // Calculate progressive green background opacity based on progress (gradual from 0% to 100%)
  const getProgressiveGreenBackground = () => {
    if (goal.status === 'archived') return '';
    
    // For active goals, gradually increase green background opacity starting from 0%
    if (goal.status === 'active') {
      // Smooth gradual transition - even 1% progress shows a tiny hint of green
      const greenOpacity = Math.min(Math.round((progress / 100) * 15) || (progress > 0 ? 1 : 0), 15);
      return greenOpacity > 0 ? `bg-success/${greenOpacity}` : '';
    }
    
    // Completed goals get full green background
    if (goal.status === 'completed') {
      return 'bg-success/15';
    }
    
    return '';
  };

  // Animate progress bar on mount and updates with smooth transition
  useEffect(() => {
    if (progressRef.current) {
      const timer = setTimeout(() => {
        animateProgressBar(progressRef.current!, progress);
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [progress, animateProgressBar]);

  // Success celebration for completed goals
  useEffect(() => {
    if (goal.status === 'completed' && cardRef.current) {
      triggerSuccessCelebration(cardRef.current);
    }
  }, [goal.status, triggerSuccessCelebration]);

  // Enhanced touch handlers with visual feedback
  const handleCardTouch = useCallback(() => {
    setIsPressed(true);
  }, []);

  const handleCardTouchEnd = useCallback(() => {
    setIsPressed(false);
  }, []);
  
  const getStatusBadge = () => {
    switch (goal.status) {
      case 'completed':
        return (
          <Badge className="bg-success/20 text-success border-success/40 shadow-sm">
            <CheckCircle className="w-3 h-3 mr-1.5" />
            Completed
          </Badge>
        );
      case 'archived':
        return (
          <Badge className="bg-muted/15 text-muted-foreground border-muted/30 shadow-sm">
            <Archive className="w-3 h-3 mr-1.5" />
            Archived
          </Badge>
        );
      default:
        // Dynamic progress-based status for active goals
        if (progress === 0) {
          return (
            <Badge className="bg-accent/15 text-accent-foreground border-accent/30 shadow-sm">
              <Sparkles className="w-3 h-3 mr-1.5" />
              Ready to Begin
            </Badge>
          );
        } else if (progress < 30) {
          return (
            <Badge className="bg-primary/15 text-primary border-primary/30 shadow-sm">
              <Target className="w-3 h-3 mr-1.5" />
              Getting Started
            </Badge>
          );
        } else if (progress < 80) {
          return (
            <Badge className="bg-warning/15 text-warning border-warning/30 shadow-sm dark:bg-warning/20 dark:text-warning-foreground dark:border-warning/40">
              <Zap className="w-3 h-3 mr-1.5" />
              Making Progress
            </Badge>
          );
        } else {
          return (
            <Badge className="bg-success/15 text-success border-success/30 shadow-sm">
              <CheckCircle className="w-3 h-3 mr-1.5" />
              Almost Done!
            </Badge>
          );
        }
    }
  };
  
  const getModalityBadge = () => {
    const Icon = goal.modality === 'project' ? Layers3 : ListChecks;
    
    // Different colors for project vs checklist
    if (goal.modality === 'project') {
      return (
        <Badge className="bg-primary/15 text-primary border-primary/30 shadow-sm">
          <Icon className="w-3 h-3 mr-1.5" />
          Project
        </Badge>
      );
    } else {
      return (
        <Badge className="bg-accent/15 text-accent-foreground border-accent/30 shadow-sm">
          <Icon className="w-3 h-3 mr-1.5" />
          Checklist
        </Badge>
      );
    }
  };
  
  const getDueStatus = () => {
    if (!goal.target_date || goal.status !== 'active') return null;
    
    const now = new Date();
    const targetDate = new Date(goal.target_date);
    const diffTime = targetDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return { text: "Due today", color: "text-warning", urgent: true, bg: "bg-warning/15", border: "border-warning/30" };
    if (diffDays === 1) return { text: "Due tomorrow", color: "text-warning", urgent: true, bg: "bg-warning/15", border: "border-warning/30" };
    if (diffDays < 0) return { text: `Overdue by ${Math.abs(diffDays)} days`, color: "text-destructive", urgent: true, bg: "bg-destructive/15", border: "border-destructive/30" };
    if (diffDays <= 7) return { text: `Due in ${diffDays} days`, color: "text-warning", urgent: false, bg: "bg-warning/10", border: "border-warning/20" };
    
    return { text: `Due in ${diffDays} days`, color: "text-muted-foreground", urgent: false, bg: "bg-muted/10", border: "border-muted/20" };
  };

  const getTaskProgress = () => {
    if (goal.total_tasks === 0) return "No tasks yet";
    return `${goal.completed_tasks} of ${goal.total_tasks} completed`;
  };

  return (
    <div className="group relative">
      {/* Mobile-Optimized Interactive Card */}
      <div 
        ref={cardRef}
        onTouchStart={handleCardTouch}
        onTouchEnd={handleCardTouchEnd}
        className={cn(
          "relative overflow-hidden rounded-2xl cursor-pointer will-change-transform",
          // Base theme-aware background - solid for performance
          "bg-card/95",
          // Border with theme awareness
          "border border-border/40",
          // Theme-aware shadows
          actualTheme === 'dark' 
            ? "shadow-lg shadow-background/20" 
            : "shadow-md shadow-foreground/5",
          // Enhanced hover states
          "hover:shadow-xl hover:border-border/60 hover:bg-card",
          actualTheme === 'dark'
            ? "hover:shadow-background/30"
            : "hover:shadow-primary/15",
          // Smooth transitions with better easing
          "transition-all duration-300 cubic-bezier(0.23, 1, 0.32, 1)",
          // Press state with scale effect
          isPressed && "scale-[0.98]",
          // Progressive green background based on progress
          getProgressiveGreenBackground(),
          goal.status === 'completed' && "ring-1 ring-success/30",
          // Enhanced padding for better touch targets
          "p-4"
        )}
      >
        
        {/* Dynamic theme-aware overlay */}
        <div className={cn(
          "absolute inset-0 pointer-events-none",
          actualTheme === 'dark'
            ? "bg-gradient-to-br from-primary/3 via-transparent to-accent/3"
            : "bg-gradient-to-br from-primary/2 via-transparent to-accent/2"
        )} />
        
        {/* Header with Enhanced Badges */}
        <div className="relative z-10 flex items-start justify-between">
          <div className="flex items-center gap-2 flex-wrap">
            {getStatusBadge()}
            {getModalityBadge()}
          </div>
          
          {/* Enhanced Actions Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm"
                className={cn(
                  "opacity-60 group-hover:opacity-100 transition-all duration-300",
                  "h-6 w-6 p-0 rounded-full",
                  "bg-muted/15 border border-border/30",
                  "hover:bg-muted/25 hover:border-border/50",
                  "active:scale-95",
                  "shadow-sm hover:shadow-md"
                )}
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent 
              align="end" 
              className="bg-popover border-border/50 shadow-xl z-50"
            >
              {goal.status === 'active' && (
                  <>
                    <DropdownMenuItem onClick={() => onStatusChange(goal.id, 'completed')}>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Mark Complete
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onStatusChange(goal.id, 'archived')}>
                      <Archive className="w-4 h-4 mr-2" />
                      Archive
                    </DropdownMenuItem>
                  </>
              )}
              {goal.status === 'archived' && (
                <DropdownMenuItem onClick={() => onStatusChange(goal.id, 'active')}>
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Reactivate
                </DropdownMenuItem>
              )}
              {goal.status === 'completed' && (
                <DropdownMenuItem onClick={() => onReopenGoal?.(goal.id)}>
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Reopen
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => setShowDeleteDialog(true)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Enhanced Title and Description */}
        <div className="relative z-10 mb-3">
          <h3 className="text-lg font-semibold leading-tight mb-1">
            <Link 
              to={`/goals/${goal.id}`}
              className={cn(
                "text-foreground hover:text-primary transition-all duration-300",
                "line-clamp-2 block min-h-[44px] flex items-center",
                "hover:underline decoration-primary/30 underline-offset-4"
              )}
            >
              {goal.title}
            </Link>
          </h3>
          
          {goal.description && (
            <p className="text-muted-foreground text-sm leading-relaxed line-clamp-2 opacity-80">
              {goal.description}
            </p>
          )}
        </div>
        
        {/* Enhanced Progress Section */}
        <div className="relative z-10 mb-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Progress</span>
            <span className={cn(
              "text-sm font-semibold tabular-nums",
              goal.status === 'completed' ? "text-success" : "text-foreground"
            )}>
              {Math.round(progress)}%
            </span>
          </div>
          
          {/* Enhanced Theme-aware Progress Bar */}
          <div className={cn(
            "relative h-3 rounded-full overflow-hidden",
            actualTheme === 'dark' 
              ? "bg-muted/20 border border-border/10" 
              : "bg-muted/30 border border-border/20"
          )}>
            <div 
              ref={progressRef}
              className={cn(
                "h-full rounded-full transition-all duration-800 cubic-bezier(0.23, 1, 0.32, 1)",
                "will-change-transform",
                // Progress bar turns green only when completed OR when active goal reaches 100%
                (goal.status === 'completed' || (goal.status === 'active' && progress >= 100))
                  ? "bg-gradient-to-r from-success via-success/90 to-success/80 shadow-lg shadow-success/30" 
                  : "bg-gradient-to-r from-primary via-primary/90 to-primary/80 shadow-md shadow-primary/15"
              )}
              style={{ width: '0%' }}
            />
            {/* Progress glow effect */}
            <div className={cn(
              "absolute inset-0 rounded-full opacity-60",
              (goal.status === 'completed' || (goal.status === 'active' && progress >= 100))
                ? "bg-gradient-to-r from-success/30 to-transparent"
                : "bg-gradient-to-r from-primary/20 to-transparent"
            )} />
          </div>
        </div>
        
        {/* Enhanced Smart Info Pills */}
        <div className="relative z-10 flex items-center gap-2 flex-wrap">
          {/* Enhanced Task Progress Pill with Dynamic Colors */}
          <div className={cn(
            "px-3 py-1.5 rounded-full border flex items-center gap-2 min-h-[32px]",
            "hover:bg-muted/30 transition-colors duration-200",
            // Dynamic colors based on progress
            progress === 0 ? "bg-muted/15 border-muted/25" :
            progress < 30 ? "bg-primary/10 border-primary/25" :
            progress < 80 ? "bg-warning/10 border-warning/25" :
            progress >= 100 ? "bg-success/15 border-success/30" :
            "bg-success/10 border-success/25"
          )}>
            <Target className={cn(
              "w-3.5 h-3.5",
              progress === 0 ? "text-muted-foreground" :
              progress < 30 ? "text-primary" :
              progress < 80 ? "text-warning" :
              "text-success"
            )} />
            <span className={cn(
              "text-xs font-medium",
              progress === 0 ? "text-muted-foreground" :
              progress < 30 ? "text-primary" :
              progress < 80 ? "text-warning" :
              "text-success"
            )}>
              {getTaskProgress()}
            </span>
          </div>
          
          {/* Smart Due Status Pill */}
          {(() => {
            const dueStatus = getDueStatus();
            if (!dueStatus) return null;
            
            return (
              <div className={cn(
                "px-3 py-1.5 rounded-full border flex items-center gap-2 min-h-[32px]",
                "hover:bg-muted/30 transition-colors duration-200",
                dueStatus.bg,
                dueStatus.border
              )}>
                <Calendar className={cn(
                  "w-3.5 h-3.5",
                  dueStatus.color === "text-destructive" ? "text-destructive" :
                  dueStatus.color === "text-warning" ? "text-warning" :
                  "text-accent-foreground"
                )} />
                <span className={cn(
                  "text-xs font-medium",
                  dueStatus.color
                )}>
                  {dueStatus.text}
                </span>
              </div>
            );
          })()}
          
          {/* Enhanced Weekly Commitment Pill */}
          {goal.weekly_hours && (
            <div className={cn(
              "px-3 py-1.5 rounded-full border flex items-center gap-2 min-h-[32px]",
              "hover:bg-muted/30 transition-colors duration-200",
              // Color based on commitment level
              goal.weekly_hours >= 10 ? "bg-destructive/10 border-destructive/25" :
              goal.weekly_hours >= 5 ? "bg-warning/10 border-warning/25" :
              "bg-accent/15 border-accent/30"
            )}>
              <Clock className={cn(
                "w-3.5 h-3.5",
                goal.weekly_hours >= 10 ? "text-destructive" :
                goal.weekly_hours >= 5 ? "text-warning" :
                "text-accent-foreground"
              )} />
              <span className={cn(
                "text-xs font-medium tabular-nums",
                goal.weekly_hours >= 10 ? "text-destructive" :
                goal.weekly_hours >= 5 ? "text-warning" :
                "text-accent-foreground"
              )}>
                {goal.weekly_hours}h/week
              </span>
            </div>
          )}
        </div>
      </div>
      
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="bg-popover border-border/50 shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">Delete Goal</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              Are you sure you want to delete "{goal.title}"? This will permanently delete the goal and all its milestones and tasks. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-3">
            <AlertDialogCancel className="min-h-[44px]">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                onDelete(goal.id);
                setShowDeleteDialog(false);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 min-h-[44px]"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};