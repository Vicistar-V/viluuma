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
      {/* Glassmorphism Card */}
      <div className={cn(
        "relative overflow-hidden rounded-xl",
        "bg-gradient-to-br from-background via-card to-background",
        "border border-border/50",
        "shadow-[0_0_0_1px_hsl(var(--success)/0.1),0_4px_12px_hsl(var(--success)/0.05),inset_0_1px_0_hsl(var(--success)/0.1)]",
        "hover:shadow-[0_0_0_1px_hsl(var(--success)/0.2),0_8px_24px_hsl(var(--success)/0.1),inset_0_1px_0_hsl(var(--success)/0.2)] hover:border-success/30",
        "p-6 space-y-5"
      )}>
        
        {/* Status Gradient Overlay */}
        <div className={cn(
          "absolute inset-0 opacity-[0.02] pointer-events-none",
          goal.status === 'completed' && "bg-gradient-to-br from-success to-success/50",
          goal.status === 'archived' && "bg-gradient-to-br from-muted to-muted/50",
          goal.status === 'active' && "bg-gradient-to-br from-primary to-primary/50"
        )} />

        {/* Header */}
        <div className="flex items-start justify-between relative z-10">
          <div className="flex-1 min-w-0 space-y-3">
            {/* Status and Modality Badges */}
            <div className="flex items-center gap-2 flex-wrap">
              {getStatusBadge()}
              {getModalityBadge()}
            </div>

            {/* Goal Title */}
            <div>
              <h3 className="text-xl font-bold leading-tight mb-2">
                <Link 
                  to={`/goals/${goal.id}`}
                  className="text-foreground hover:text-primary transition-colors line-clamp-2 block"
                >
                  {goal.title}
                </Link>
              </h3>
              
              {goal.description && (
                <p className="text-muted-foreground text-sm leading-relaxed line-clamp-2">
                  {goal.description}
                </p>
              )}
            </div>
          </div>
          
          {/* Actions Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                className={cn(
                  "opacity-0 group-hover:opacity-100",
                  "bg-background hover:bg-accent",
                  "border border-border/30 hover:border-border/60",
                  "h-8 w-8 p-0 rounded-lg"
                )}
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-background border-border/50">
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
        
        {/* Progress Section */}
        <div className="space-y-4 relative z-10">
          {/* Progress Stats */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Progress</span>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-foreground">{goal.completed_tasks}</span>
              <span className="text-sm text-muted-foreground">/ {goal.total_tasks}</span>
              <span className="text-xs text-muted-foreground font-medium ml-2">
                {Math.round(progress)}%
              </span>
            </div>
          </div>
          
          {/* Enhanced Progress Bar */}
          <div className="relative">
            <div className="h-3 bg-muted/30 rounded-full overflow-hidden">
              <div 
                className={cn(
                  "h-full rounded-full transition-all duration-500",
                  goal.status === 'completed' 
                    ? "bg-gradient-to-r from-success/80 to-success" 
                    : "bg-gradient-to-r from-primary/80 to-primary"
                )}
                style={{ width: `${Math.min(progress, 100)}%` }}
              />
            </div>
          </div>
        </div>
        
        {/* Meta Information */}
        <div className="flex items-center gap-6 text-sm text-muted-foreground relative z-10">
          {goal.target_date && (
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-accent/30">
                <Calendar className="w-3.5 h-3.5" />
              </div>
              <span className="font-medium">Due {formatDate(goal.target_date)}</span>
            </div>
          )}
          {goal.weekly_hours && (
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-accent/30">
                <Clock className="w-3.5 h-3.5" />
              </div>
              <span className="font-medium">{goal.weekly_hours}h/week</span>
            </div>
          )}
        </div>
        
        {/* Creation Date - Bottom Corner */}
        <div className="text-xs text-muted-foreground/70 relative z-10">
          Created {formatDate(goal.created_at)}
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