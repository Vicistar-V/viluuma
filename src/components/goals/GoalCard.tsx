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
      {/* Glassmorphism Card with No Backdrop Blur */}
      <div className={cn(
        "relative overflow-hidden rounded-3xl",
        "bg-gradient-to-br from-card/80 via-card/60 to-card/40",
        "border border-white/20 dark:border-white/10",
        "shadow-2xl shadow-black/10 dark:shadow-black/30",
        "hover:shadow-3xl hover:shadow-primary/20 dark:hover:shadow-primary/30",
        "hover:border-white/30 dark:hover:border-white/20",
        "transition-all duration-500 ease-out",
        "hover:scale-[1.02] hover:-translate-y-1",
        "p-8",
        "backdrop-blur-none"
      )}>
        
        {/* Subtle Gradient Overlays */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-tl from-secondary/3 via-transparent to-muted/3 pointer-events-none" />
        
        {/* Animated Background Orb */}
        <div className="absolute top-4 right-4 w-24 h-24 bg-gradient-to-br from-primary/10 to-accent/10 rounded-full blur-xl animate-pulse opacity-50" />
        
        {/* Header with Floating Badges */}
        <div className="relative z-10 flex items-start justify-between mb-6">
          <div className="flex items-center gap-3 flex-wrap">
            {getStatusBadge()}
            {getModalityBadge()}
          </div>
          
          {/* Glass Actions Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                className={cn(
                  "opacity-70 group-hover:opacity-100 transition-all duration-300",
                  "h-9 w-9 p-0 rounded-full",
                  "bg-white/10 dark:bg-white/5 border border-white/20 dark:border-white/10",
                  "hover:bg-white/20 dark:hover:bg-white/10",
                  "hover:scale-110 hover:shadow-lg hover:shadow-primary/20"
                )}
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-card/90 backdrop-blur-md border-white/20">
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

        {/* Goal Title and Description */}
        <div className="relative z-10 mb-8">
          <h3 className="text-3xl font-bold leading-tight mb-3 bg-gradient-to-br from-foreground to-foreground/80 bg-clip-text text-transparent">
            <Link 
              to={`/goals/${goal.id}`}
              className="hover:from-primary hover:to-primary/80 transition-all duration-300 line-clamp-2 block"
            >
              {goal.title}
            </Link>
          </h3>
          
          {goal.description && (
            <p className="text-muted-foreground/90 leading-relaxed line-clamp-3 text-lg">
              {goal.description}
            </p>
          )}
        </div>
        
        {/* Glass Progress Section */}
        <div className="relative z-10 mb-8 p-4 rounded-2xl bg-white/5 dark:bg-white/3 border border-white/10 dark:border-white/5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-muted-foreground/80 uppercase tracking-wider">Progress</span>
            <span className="text-lg font-bold text-foreground">
              {goal.completed_tasks}/{goal.total_tasks}
            </span>
          </div>
          
          {/* Glassmorphic Progress Bar */}
          <div className="relative h-3 bg-white/10 dark:bg-white/5 rounded-full overflow-hidden border border-white/20 dark:border-white/10">
            <div 
              className={cn(
                "h-full rounded-full transition-all duration-700 ease-out relative overflow-hidden",
                goal.status === 'completed' 
                  ? "bg-gradient-to-r from-success to-success/80" 
                  : "bg-gradient-to-r from-primary to-primary/80"
              )}
              style={{ width: `${Math.min(progress, 100)}%` }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent animate-pulse" />
            </div>
            <div className="absolute inset-0 bg-gradient-to-r from-white/5 via-white/10 to-white/5 animate-pulse" />
          </div>
          
          <div className="mt-2 text-center">
            <span className="text-2xl font-bold bg-gradient-to-br from-primary to-primary/70 bg-clip-text text-transparent">
              {Math.round(progress)}%
            </span>
          </div>
        </div>
        
        {/* Glass Info Pills */}
        <div className="relative z-10 flex items-center gap-3 flex-wrap">
          {/* Task Count Pill */}
          <div className="px-4 py-2.5 bg-white/10 dark:bg-white/5 rounded-full border border-white/20 dark:border-white/10 flex items-center gap-2 shadow-lg backdrop-blur-none">
            <Target className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold text-foreground/90">
              {goal.total_tasks} tasks
            </span>
          </div>
          
          {/* Due Date Pill */}
          {goal.target_date && (
            <div className="px-4 py-2.5 bg-white/10 dark:bg-white/5 rounded-full border border-white/20 dark:border-white/10 flex items-center gap-2 shadow-lg backdrop-blur-none">
              <Calendar className="w-4 h-4 text-accent-foreground" />
              <span className="text-sm font-semibold text-foreground/90">
                Due {formatDate(goal.target_date)}
              </span>
            </div>
          )}
          
          {/* Weekly Hours Pill */}
          {goal.weekly_hours && (
            <div className="px-4 py-2.5 bg-white/10 dark:bg-white/5 rounded-full border border-white/20 dark:border-white/10 flex items-center gap-2 shadow-lg backdrop-blur-none">
              <Clock className="w-4 h-4 text-secondary-foreground" />
              <span className="text-sm font-semibold text-foreground/90">
                {goal.weekly_hours}h/week
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