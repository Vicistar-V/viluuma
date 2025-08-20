import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Calendar, Clock, MoreVertical, Target, CheckCircle, Archive, Trash2, RotateCcw, Layers3, ListChecks, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Goal } from '@/hooks/useGoals';
import { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { useMobileAnimations } from '@/hooks/useMobileAnimations';

interface GoalCardProps {
  goal: Goal;
  onStatusChange: (goalId: string, status: 'active' | 'archived' | 'completed') => void;
  onReopenGoal?: (goalId: string) => void;
  onDelete: (goalId: string) => void;
}

export const GoalCard = ({ goal, onStatusChange, onReopenGoal, onDelete }: GoalCardProps) => {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const { handleTouchFeedback, triggerSuccessCelebration } = useMobileAnimations();
  
  const progress = goal.total_tasks > 0 ? (goal.completed_tasks / goal.total_tasks) * 100 : 0;

  // Animate progress bar on mount and updates
  useEffect(() => {
    if (progressRef.current) {
      setTimeout(() => {
        progressRef.current!.style.width = `${Math.min(progress, 100)}%`;
      }, 100);
    }
  }, [progress]);

  // Success celebration for completed goals
  useEffect(() => {
    if (goal.status === 'completed' && cardRef.current) {
      triggerSuccessCelebration(cardRef.current);
    }
  }, [goal.status, triggerSuccessCelebration]);

  const handleCardTouch = () => {
    handleTouchFeedback('light');
  };

  const handleActionTouch = (intensity: 'light' | 'medium' | 'heavy' = 'medium') => {
    handleTouchFeedback(intensity);
  };
  
  const getStatusBadge = () => {
    switch (goal.status) {
      case 'completed':
        return (
          <Badge className="bg-success/10 text-success-foreground border-success/30 shadow-sm">
            <CheckCircle className="w-3 h-3 mr-1.5" />
            Completed
          </Badge>
        );
      case 'archived':
        return (
          <Badge className="bg-muted/20 text-muted-foreground border-muted shadow-sm">
            <Archive className="w-3 h-3 mr-1.5" />
            Archived
          </Badge>
        );
      default:
        return (
          <Badge className="bg-primary/10 text-primary-foreground border-primary/30 shadow-sm">
            <Sparkles className="w-3 h-3 mr-1.5" />
            Active
          </Badge>
        );
    }
  };
  
  const getModalityBadge = () => {
    const Icon = goal.modality === 'project' ? Layers3 : ListChecks;
    return (
      <Badge variant="outline" className="bg-accent/10 border-accent shadow-sm">
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
        className={cn(
          "relative overflow-hidden rounded-2xl cursor-pointer",
          "bg-gradient-to-br from-card via-card/90 to-card/95",
          "border border-border/50",
          "shadow-sm shadow-foreground/5",
          "hover:shadow-md hover:shadow-primary/10",
          "hover:border-border",
          "hover:from-card hover:via-card/95 hover:to-card",
          "transition-all duration-300 cubic-bezier(0.23, 1, 0.32, 1)",
          "animated-card touch-feedback",
          "p-4 backdrop-blur-sm",
          goal.status === 'completed' && "ring-1 ring-success/30 bg-gradient-to-br from-success/5 via-card to-success/5"
        )}
      >
        
        {/* Theme-aware subtle overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/2 via-transparent to-accent/2 pointer-events-none" />
        
        {/* Header with Compact Badges */}
        <div className="relative z-10 flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            {getStatusBadge()}
            {getModalityBadge()}
          </div>
          
          {/* Ultra Transparent Actions Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm"
                onTouchStart={() => handleActionTouch('light')}
                className={cn(
                  "opacity-50 group-hover:opacity-80 transition-all duration-200",
                  "h-7 w-7 p-0 rounded-full touch-feedback",
                  "bg-muted/20 border border-border/30",
                  "hover:bg-muted/40 hover:border-border/50 active:scale-90"
                )}
              >
                <MoreVertical className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-popover/95 backdrop-blur-md border-border z-50">
              {goal.status === 'active' && (
                <>
                  <DropdownMenuItem onClick={() => { handleActionTouch('heavy'); onStatusChange(goal.id, 'completed'); }}>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Mark Complete
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { handleActionTouch('medium'); onStatusChange(goal.id, 'archived'); }}>
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

        {/* Compact Title and Description */}
        <div className="relative z-10 mb-4">
          <h3 className="text-lg font-semibold leading-tight mb-1">
            <Link 
              to={`/goals/${goal.id}`}
              onTouchStart={() => handleActionTouch('light')}
              className="text-foreground hover:text-primary transition-all duration-200 line-clamp-2 block touch-feedback"
            >
              {goal.title}
            </Link>
          </h3>
          
          {goal.description && (
            <p className="text-muted-foreground/60 text-sm leading-relaxed line-clamp-2">
              {goal.description}
            </p>
          )}
        </div>
        
        {/* Ultra Transparent Progress Section */}
        <div className="relative z-10 mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Progress</span>
            <span className="text-sm font-semibold text-foreground">
              {Math.round(progress)}%
            </span>
          </div>
          
          {/* Theme-aware Progress Bar */}
          <div className="relative h-2 bg-muted/30 rounded-full overflow-hidden border border-border/20">
            <div 
              ref={progressRef}
              className={cn(
                "h-full rounded-full transition-all duration-700 cubic-bezier(0.23, 1, 0.32, 1)",
                goal.status === 'completed' 
                  ? "bg-gradient-to-r from-success to-success/80 shadow-sm shadow-success/30" 
                  : "bg-gradient-to-r from-primary to-primary/80 shadow-sm shadow-primary/20"
              )}
              style={{ width: '0%' }}
            />
          </div>
        </div>
        
        {/* Theme-aware Info Pills */}
        <div className="relative z-10 flex items-center gap-2 flex-wrap">
          {/* Task Count Pill */}
          <div className="px-2.5 py-1 bg-muted/20 rounded-full border border-border/20 flex items-center gap-1.5">
            <Target className="w-3 h-3 text-primary" />
            <span className="text-xs font-medium text-muted-foreground">
              {goal.total_tasks}
            </span>
          </div>
          
          {/* Due Date Pill */}
          {goal.target_date && (
            <div className="px-2.5 py-1 bg-muted/20 rounded-full border border-border/20 flex items-center gap-1.5">
              <Calendar className="w-3 h-3 text-accent-foreground" />
              <span className="text-xs font-medium text-muted-foreground">
                {formatDate(goal.target_date)}
              </span>
            </div>
          )}
          
          {/* Weekly Hours Pill */}
          {goal.weekly_hours && (
            <div className="px-2.5 py-1 bg-muted/20 rounded-full border border-border/20 flex items-center gap-1.5">
              <Clock className="w-3 h-3 text-secondary-foreground" />
              <span className="text-xs font-medium text-muted-foreground">
                {goal.weekly_hours}h
              </span>
            </div>
          )}
        </div>
      </div>
      
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="bg-popover/95 backdrop-blur-md border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Goal</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{goal.title}"? This will permanently delete the goal and all its milestones and tasks. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                onDelete(goal.id);
                setShowDeleteDialog(false);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};