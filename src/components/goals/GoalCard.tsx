import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Calendar, Clock, MoreVertical, Target, CheckCircle, Archive, Trash2, RotateCcw, Layers3, ListChecks, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Goal } from '@/hooks/useGoals';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface GoalCardProps {
  goal: Goal;
  onStatusChange: (goalId: string, status: 'active' | 'archived' | 'completed') => void;
  onReopenGoal?: (goalId: string) => void;
  onDelete: (goalId: string) => void;
}

export const GoalCard = ({ goal, onStatusChange, onReopenGoal, onDelete }: GoalCardProps) => {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  
  const progress = goal.total_tasks > 0 ? (goal.completed_tasks / goal.total_tasks) * 100 : 0;
  
  const getStatusBadge = () => {
    switch (goal.status) {
      case 'completed':
        return (
          <Badge className="bg-success/20 text-success border-success/40 backdrop-blur-none shadow-lg shadow-success/10">
            <CheckCircle className="w-3 h-3 mr-1.5" />
            Completed
          </Badge>
        );
      case 'archived':
        return (
          <Badge className="bg-muted/30 text-muted-foreground border-muted/50 backdrop-blur-none shadow-lg shadow-muted/10">
            <Archive className="w-3 h-3 mr-1.5" />
            Archived
          </Badge>
        );
      default:
        return (
          <Badge className="bg-primary/20 text-primary border-primary/40 backdrop-blur-none shadow-lg shadow-primary/10">
            <Sparkles className="w-3 h-3 mr-1.5" />
            Active
          </Badge>
        );
    }
  };
  
  const getModalityBadge = () => {
    const Icon = goal.modality === 'project' ? Layers3 : ListChecks;
    return (
      <Badge variant="outline" className="bg-accent/20 border-accent/40 backdrop-blur-none shadow-md">
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
      {/* Ultra Transparent Glassmorphism Card */}
      <div className={cn(
        "relative overflow-hidden rounded-2xl",
        "bg-gradient-to-br from-card/20 via-card/12 to-card/8",
        "border border-white/6 dark:border-white/3",
        "shadow-md shadow-black/3 dark:shadow-black/15",
        "hover:shadow-lg hover:shadow-primary/8 dark:hover:shadow-primary/15",
        "hover:border-white/12 dark:hover:border-white/6",
        "hover:from-card/30 hover:via-card/20 hover:to-card/12",
        "transition-all duration-300 ease-out",
        "hover:scale-[1.01] hover:-translate-y-0.5",
        "p-4",
        "backdrop-blur-none"
      )}>
        
        {/* Almost Invisible Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/1 via-transparent to-accent/1 pointer-events-none" />
        
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
                className={cn(
                  "opacity-40 group-hover:opacity-70 transition-all duration-200",
                  "h-7 w-7 p-0 rounded-full",
                  "bg-white/2 dark:bg-white/1 border border-white/5 dark:border-white/3",
                  "hover:bg-white/8 dark:hover:bg-white/4"
                )}
              >
                <MoreVertical className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-card/95 backdrop-blur-md border-white/20 z-50">
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

        {/* Compact Title and Description */}
        <div className="relative z-10 mb-4">
          <h3 className="text-lg font-semibold leading-tight mb-1">
            <Link 
              to={`/goals/${goal.id}`}
              className="text-foreground hover:text-primary transition-all duration-200 line-clamp-2 block"
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
            <span className="text-xs font-medium text-muted-foreground/50 uppercase tracking-wide">Progress</span>
            <span className="text-sm font-semibold text-foreground/80">
              {goal.completed_tasks}/{goal.total_tasks}
            </span>
          </div>
          
          {/* Nearly Invisible Progress Bar */}
          <div className="relative h-2 bg-white/3 dark:bg-white/2 rounded-full overflow-hidden">
            <div 
              className={cn(
                "h-full rounded-full transition-all duration-500 ease-out",
                goal.status === 'completed' 
                  ? "bg-gradient-to-r from-success/60 to-success/40" 
                  : "bg-gradient-to-r from-primary/60 to-primary/40"
              )}
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
          
          <div className="mt-1.5 text-right">
            <span className="text-sm font-semibold text-muted-foreground/70">
              {Math.round(progress)}%
            </span>
          </div>
        </div>
        
        {/* Ultra Transparent Info Pills */}
        <div className="relative z-10 flex items-center gap-2 flex-wrap">
          {/* Task Count Pill */}
          <div className="px-2.5 py-1 bg-white/3 dark:bg-white/2 rounded-full border border-white/5 dark:border-white/3 flex items-center gap-1.5">
            <Target className="w-3 h-3 text-primary/60" />
            <span className="text-xs font-medium text-foreground/60">
              {goal.total_tasks}
            </span>
          </div>
          
          {/* Due Date Pill */}
          {goal.target_date && (
            <div className="px-2.5 py-1 bg-white/3 dark:bg-white/2 rounded-full border border-white/5 dark:border-white/3 flex items-center gap-1.5">
              <Calendar className="w-3 h-3 text-accent-foreground/60" />
              <span className="text-xs font-medium text-foreground/60">
                {formatDate(goal.target_date)}
              </span>
            </div>
          )}
          
          {/* Weekly Hours Pill */}
          {goal.weekly_hours && (
            <div className="px-2.5 py-1 bg-white/3 dark:bg-white/2 rounded-full border border-white/5 dark:border-white/3 flex items-center gap-1.5">
              <Clock className="w-3 h-3 text-secondary-foreground/60" />
              <span className="text-xs font-medium text-foreground/60">
                {goal.weekly_hours}h
              </span>
            </div>
          )}
        </div>
      </div>
      
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="bg-card/95 backdrop-blur-md border-white/20">
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