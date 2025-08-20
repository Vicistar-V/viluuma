import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Calendar, Clock, MoreVertical, Target, CheckCircle, Archive, Trash2, RotateCcw, Layers3, ListChecks } from 'lucide-react';
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
          <Badge className="bg-success/20 text-success border-success/30">
            <CheckCircle className="w-3 h-3 mr-1.5" />
            Completed
          </Badge>
        );
      case 'archived':
        return (
          <Badge className="bg-muted/30 text-muted-foreground border-border/50">
            <Archive className="w-3 h-3 mr-1.5" />
            Archived
          </Badge>
        );
      default:
        return (
          <Badge className="bg-primary/10 text-primary border-primary/20">
            <Target className="w-3 h-3 mr-1.5" />
            Active
          </Badge>
        );
    }
  };
  
  const getModalityBadge = () => {
    const Icon = goal.modality === 'project' ? Layers3 : ListChecks;
    return (
      <Badge variant="outline" className="bg-accent/30 border-border/50">
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
      {/* Clean Professional Card */}
      <div className={cn(
        "relative overflow-hidden rounded-2xl",
        "bg-card",
        "border border-border/60",
        "shadow-sm hover:shadow-md transition-all duration-200",
        "hover:border-border/80",
        "p-6"
      )}>
        
        {/* Subtle Background Accent */}
        <div className="absolute inset-0 opacity-[0.02] pointer-events-none bg-gradient-to-br from-primary/20 to-transparent" />

        {/* Header with Badges and Actions */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-2">
            {getStatusBadge()}
            {getModalityBadge()}
          </div>
          
          {/* Actions Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                className={cn(
                  "opacity-0 group-hover:opacity-100 transition-opacity",
                  "h-8 w-8 p-0 rounded-lg"
                )}
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
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
        <div className="mb-6">
          <h3 className="text-2xl font-bold leading-tight mb-2">
            <Link 
              to={`/goals/${goal.id}`}
              className="text-foreground hover:text-primary transition-colors line-clamp-2 block"
            >
              {goal.title}
            </Link>
          </h3>
          
          {goal.description && (
            <p className="text-muted-foreground leading-relaxed line-clamp-3">
              {goal.description}
            </p>
          )}
        </div>
        
        {/* Progress Section - Simplified */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-muted-foreground">Progress</span>
            <span className="text-sm font-semibold text-foreground">
              {goal.completed_tasks}/{goal.total_tasks} ({Math.round(progress)}%)
            </span>
          </div>
          
          <div className="h-2 bg-muted/40 rounded-full overflow-hidden">
            <div 
              className={cn(
                "h-full rounded-full transition-all duration-300",
                goal.status === 'completed' 
                  ? "bg-success" 
                  : "bg-primary"
              )}
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
        </div>
        
        {/* Bottom Pill Badges */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Task Count Badge */}
          <div className="px-3 py-1.5 bg-muted/50 rounded-full flex items-center gap-1.5">
            <Target className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground">
              {goal.total_tasks} tasks
            </span>
          </div>
          
          {/* Due Date Badge */}
          {goal.target_date && (
            <div className="px-3 py-1.5 bg-muted/50 rounded-full flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground">
                Due {formatDate(goal.target_date)}
              </span>
            </div>
          )}
          
          {/* Weekly Hours Badge */}
          {goal.weekly_hours && (
            <div className="px-3 py-1.5 bg-muted/50 rounded-full flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground">
                {goal.weekly_hours}h/week
              </span>
            </div>
          )}
        </div>
      </div>
      
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
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