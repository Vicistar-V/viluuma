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
        return (
          <Badge className="bg-primary/15 text-primary border-primary/30 shadow-sm">
            <Sparkles className="w-3 h-3 mr-1.5" />
            Active
          </Badge>
        );
    }
  };
  
  const getModalityBadge = () => {
    const Icon = goal.modality === 'project' ? Layers3 : ListChecks;
    return (
      <Badge variant="outline" className="bg-accent/15 border-accent/30 shadow-sm text-accent-foreground">
        <Icon className="w-3 h-3 mr-1.5" />
        {goal.modality === 'project' ? 'Project' : 'Checklist'}
      </Badge>
    );
  };
  
  const formatDate = (dateString: string | null) => {
    if (!dateString) return null;
    return new Date(dateString).toLocaleDateString();
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
          // Completed goal special styling
          goal.status === 'completed' && cn(
            "ring-1 ring-success/30",
            "bg-success/8"
          ),
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
                goal.status === 'completed' 
                  ? "bg-gradient-to-r from-success via-success/90 to-success/80 shadow-lg shadow-success/30" 
                  : "bg-gradient-to-r from-primary via-primary/90 to-primary/80 shadow-md shadow-primary/15"
              )}
              style={{ width: '0%' }}
            />
            {/* Progress glow effect */}
            <div className={cn(
              "absolute inset-0 rounded-full opacity-60",
              goal.status === 'completed'
                ? "bg-gradient-to-r from-success/30 to-transparent"
                : "bg-gradient-to-r from-primary/20 to-transparent"
            )} />
          </div>
        </div>
        
        {/* Enhanced Theme-aware Info Pills */}
        <div className="relative z-10 flex items-center gap-2 flex-wrap">
          {/* Task Count Pill */}
          <div className={cn(
            "px-3 py-1.5 rounded-full border flex items-center gap-2",
            "bg-muted/20 border-border/30 min-h-[32px]",
            "hover:bg-muted/30 transition-colors duration-200"
          )}>
            <Target className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs font-medium text-muted-foreground tabular-nums">
              {goal.total_tasks} {goal.total_tasks === 1 ? 'task' : 'tasks'}
            </span>
          </div>
          
          {/* Due Date Pill */}
          {goal.target_date && (
            <div className={cn(
              "px-3 py-1.5 rounded-full border flex items-center gap-2",
              "bg-muted/20 border-border/30 min-h-[32px]",
              "hover:bg-muted/30 transition-colors duration-200"
            )}>
              <Calendar className="w-3.5 h-3.5 text-accent-foreground" />
              <span className="text-xs font-medium text-muted-foreground">
                {formatDate(goal.target_date)}
              </span>
            </div>
          )}
          
          {/* Weekly Hours Pill */}
          {goal.weekly_hours && (
            <div className={cn(
              "px-3 py-1.5 rounded-full border flex items-center gap-2",
              "bg-muted/20 border-border/30 min-h-[32px]",
              "hover:bg-muted/30 transition-colors duration-200"
            )}>
              <Clock className="w-3.5 h-3.5 text-secondary-foreground" />
              <span className="text-xs font-medium text-muted-foreground tabular-nums">
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