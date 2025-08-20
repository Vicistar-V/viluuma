import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Calendar, Clock, MoreVertical, Target, CheckCircle, Archive, Trash2, RotateCcw, Layers3, ListChecks, Sparkles } from 'lucide-react';
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
  const { handleTouchFeedback, triggerSuccessCelebration, animateProgressBar } = useMobileAnimations();
  const { actualTheme } = useTheme();
  
  const progress = goal.total_tasks > 0 ? (goal.completed_tasks / goal.total_tasks) * 100 : 0;
  
  // Calculate progressive green background opacity based on progress (0% = no green, 100% = full green)
  const getProgressiveGreenBackground = () => {
    if (goal.status === 'archived') return '';
    
    // For active goals, gradually increase green background opacity based on progress
    if (goal.status === 'active' && progress > 0) {
      // Scale progress to green background opacity (0-15% opacity range)
      const greenOpacity = Math.min(Math.round((progress / 100) * 15), 15);
      return `bg-success/${greenOpacity}`;
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
    handleTouchFeedback('light');
    setIsPressed(true);
  }, [handleTouchFeedback]);

  const handleCardTouchEnd = useCallback(() => {
    setIsPressed(false);
  }, []);

  const handleActionTouch = useCallback((intensity: 'light' | 'medium' | 'heavy' = 'medium') => {
    handleTouchFeedback(intensity);
  }, [handleTouchFeedback]);
  
  const getStatusBadge = () => {
    switch (goal.status) {
      case 'completed':
        return (
          <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 shadow-md dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/50">
            <CheckCircle className="w-3 h-3 mr-1.5" />
            Completed
          </Badge>
        );
      case 'archived':
        return (
          <Badge className="bg-slate-100 text-slate-600 border-slate-200 shadow-md dark:bg-slate-800/40 dark:text-slate-400 dark:border-slate-700/50">
            <Archive className="w-3 h-3 mr-1.5" />
            Archived
          </Badge>
        );
      default:
        // Make active badges more lively based on progress
        if (progress >= 80) {
          return (
            <Badge className="bg-indigo-50 text-indigo-700 border-indigo-200 shadow-md dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800/50">
              <Sparkles className="w-3 h-3 mr-1.5" />
              Almost Done!
            </Badge>
          );
        } else if (progress >= 50) {
          return (
            <Badge className="bg-blue-50 text-blue-700 border-blue-200 shadow-md dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/50">
              <Target className="w-3 h-3 mr-1.5" />
              Making Progress
            </Badge>
          );
        } else if (progress > 0) {
          return (
            <Badge className="bg-purple-50 text-purple-700 border-purple-200 shadow-md dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800/50">
              <Sparkles className="w-3 h-3 mr-1.5" />
              Getting Started
            </Badge>
          );
        } else {
          return (
            <Badge className="bg-orange-50 text-orange-700 border-orange-200 shadow-md dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-800/50">
              <Sparkles className="w-3 h-3 mr-1.5" />
              Ready to Begin
            </Badge>
          );
        }
    }
  };
  
  const getModalityBadge = () => {
    const Icon = goal.modality === 'project' ? Layers3 : ListChecks;
    
    if (goal.modality === 'project') {
      return (
        <Badge className="bg-cyan-50 text-cyan-700 border-cyan-200 shadow-md dark:bg-cyan-950/40 dark:text-cyan-300 dark:border-cyan-800/50">
          <Icon className="w-3 h-3 mr-1.5" />
          Project
        </Badge>
      );
    } else {
      return (
        <Badge className="bg-rose-50 text-rose-700 border-rose-200 shadow-md dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/50">
          <Icon className="w-3 h-3 mr-1.5" />
          Checklist
        </Badge>
      );
    }
  };

  const getProgressMomentumBadge = () => {
    if (goal.status !== 'active' || progress === 0) return null;
    
    // Add momentum badges for active goals with progress
    if (progress >= 75) {
      return (
        <Badge className="bg-gradient-to-r from-emerald-50 to-teal-50 text-teal-700 border-teal-200 shadow-md dark:from-emerald-950/30 dark:to-teal-950/30 dark:text-teal-300 dark:border-teal-800/40">
          <CheckCircle className="w-3 h-3 mr-1.5" />
          🔥 On Fire!
        </Badge>
      );
    } else if (progress >= 50) {
      return (
        <Badge className="bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 border-blue-200 shadow-md dark:from-blue-950/30 dark:to-indigo-950/30 dark:text-blue-300 dark:border-blue-800/40">
          <Target className="w-3 h-3 mr-1.5" />
          ⚡ Momentum
        </Badge>
      );
    } else if (progress >= 25) {
      return (
        <Badge className="bg-gradient-to-r from-violet-50 to-purple-50 text-violet-700 border-violet-200 shadow-md dark:from-violet-950/30 dark:to-purple-950/30 dark:text-violet-300 dark:border-violet-800/40">
          <Sparkles className="w-3 h-3 mr-1.5" />
          💪 Building
        </Badge>
      );
    }
    return null;
  };
  
  const getDueStatus = () => {
    if (!goal.target_date || goal.status !== 'active') return null;
    
    const now = new Date();
    const targetDate = new Date(goal.target_date);
    const diffTime = targetDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return { text: "Due today", color: "text-amber-600", urgent: true };
    if (diffDays === 1) return { text: "Due tomorrow", color: "text-amber-600", urgent: true };
    if (diffDays < 0) return { text: `Overdue by ${Math.abs(diffDays)} days`, color: "text-red-600", urgent: true };
    if (diffDays <= 7) return { text: `Due in ${diffDays} days`, color: "text-amber-600", urgent: false };
    
    return { text: `Due in ${diffDays} days`, color: "text-muted-foreground", urgent: false };
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
            {getProgressMomentumBadge()}
          </div>
          
          {/* Enhanced Actions Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm"
                onTouchStart={() => handleActionTouch('light')}
                className={cn(
                  "opacity-60 group-hover:opacity-100 transition-all duration-300",
                  "h-8 w-8 p-0 rounded-full min-h-[44px] min-w-[44px]",
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
                    <DropdownMenuItem onClick={() => { handleActionTouch('light'); onStatusChange(goal.id, 'completed'); }}>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Mark Complete
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => { handleActionTouch('light'); onStatusChange(goal.id, 'archived'); }}>
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
              onTouchStart={() => handleActionTouch('light')}
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
        
        {/* Enhanced Smart Info Pills with Lively Colors */}
        <div className="relative z-10 flex items-center gap-2 flex-wrap">
          {/* Task Progress Pill - Dynamic colors based on progress */}
          <div className={cn(
            "px-3 py-1.5 rounded-full border flex items-center gap-2 min-h-[32px]",
            "hover:bg-opacity-80 transition-colors duration-200",
            progress >= 75 ? "bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/30 dark:border-emerald-800/40 dark:text-emerald-300" :
            progress >= 50 ? "bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-950/30 dark:border-blue-800/40 dark:text-blue-300" :
            progress >= 25 ? "bg-violet-50 border-violet-200 text-violet-700 dark:bg-violet-950/30 dark:border-violet-800/40 dark:text-violet-300" :
            progress > 0 ? "bg-orange-50 border-orange-200 text-orange-700 dark:bg-orange-950/30 dark:border-orange-800/40 dark:text-orange-300" :
            "bg-slate-50 border-slate-200 text-slate-700 dark:bg-slate-800/30 dark:border-slate-700/40 dark:text-slate-400"
          )}>
            <Target className={cn(
              "w-3.5 h-3.5",
              progress >= 75 ? "text-emerald-600 dark:text-emerald-400" :
              progress >= 50 ? "text-blue-600 dark:text-blue-400" :
              progress >= 25 ? "text-violet-600 dark:text-violet-400" :
              progress > 0 ? "text-orange-600 dark:text-orange-400" :
              "text-slate-500 dark:text-slate-400"
            )} />
            <span className="text-xs font-medium">
              {getTaskProgress()}
            </span>
          </div>
          
          {/* Smart Due Status Pill with enhanced urgency colors */}
          {(() => {
            const dueStatus = getDueStatus();
            if (!dueStatus) return null;
            
            return (
              <div className={cn(
                "px-3 py-1.5 rounded-full border flex items-center gap-2 min-h-[32px]",
                "hover:bg-opacity-80 transition-colors duration-200",
                dueStatus.color === "text-red-600" 
                  ? "bg-red-50 border-red-200 text-red-700 dark:bg-red-950/30 dark:border-red-800/40 dark:text-red-300"
                  : dueStatus.urgent 
                    ? "bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-950/30 dark:border-amber-800/40 dark:text-amber-300"
                    : "bg-sky-50 border-sky-200 text-sky-700 dark:bg-sky-950/30 dark:border-sky-800/40 dark:text-sky-300"
              )}>
                <Calendar className={cn(
                  "w-3.5 h-3.5",
                  dueStatus.color === "text-red-600" ? "text-red-600 dark:text-red-400" :
                  dueStatus.color === "text-amber-600" ? "text-amber-600 dark:text-amber-400" :
                  "text-sky-600 dark:text-sky-400"
                )} />
                <span className="text-xs font-medium">
                  {dueStatus.text}
                </span>
              </div>
            );
          })()}
          
          {/* Weekly Commitment Pill with teal accent */}
          {goal.weekly_hours && (
            <div className={cn(
              "px-3 py-1.5 rounded-full border flex items-center gap-2 min-h-[32px]",
              "bg-teal-50 border-teal-200 text-teal-700 dark:bg-teal-950/30 dark:border-teal-800/40 dark:text-teal-300",
              "hover:bg-teal-100 dark:hover:bg-teal-900/40 transition-colors duration-200"
            )}>
              <Clock className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
              <span className="text-xs font-medium tabular-nums">
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
                handleActionTouch('light');
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