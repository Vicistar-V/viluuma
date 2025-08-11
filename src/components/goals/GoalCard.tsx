import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Calendar, Clock, MoreVertical, Target, CheckCircle, Archive, Trash2, RotateCcw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Goal } from '@/hooks/useGoals';
import { useState } from 'react';

interface GoalCardProps {
  goal: Goal;
  onStatusChange: (goalId: string, status: 'active' | 'archived' | 'completed') => void;
  onDelete: (goalId: string) => void;
}

export const GoalCard = ({ goal, onStatusChange, onDelete }: GoalCardProps) => {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  
  const progress = goal.total_tasks > 0 ? (goal.completed_tasks / goal.total_tasks) * 100 : 0;
  
  const getStatusBadge = () => {
    switch (goal.status) {
      case 'completed':
        return <Badge variant="default" className="bg-green-500 hover:bg-green-600"><CheckCircle className="w-3 h-3 mr-1" />Completed</Badge>;
      case 'archived':
        return <Badge variant="secondary"><Archive className="w-3 h-3 mr-1" />Archived</Badge>;
      default:
        return <Badge variant="outline"><Target className="w-3 h-3 mr-1" />Active</Badge>;
    }
  };
  
  const getModalityBadge = () => {
    return (
      <Badge variant="outline" className="capitalize">
        {goal.modality === 'project' ? 'Project' : 'Checklist'}
      </Badge>
    );
  };
  
  const formatDate = (dateString: string | null) => {
    if (!dateString) return null;
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <Card className="group hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              {getStatusBadge()}
              {getModalityBadge()}
            </div>
            <CardTitle className="text-lg line-clamp-2">
              <Link 
                to={`/goals/${goal.id}`}
                className="hover:text-primary transition-colors"
              >
                {goal.title}
              </Link>
            </CardTitle>
            {goal.description && (
              <CardDescription className="mt-1 line-clamp-2">
                {goal.description}
              </CardDescription>
            )}
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
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
                <DropdownMenuItem onClick={() => onStatusChange(goal.id, 'active')}>
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
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="space-y-3">
          {/* Progress */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium">{goal.completed_tasks}/{goal.total_tasks} tasks</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
          
          {/* Meta info */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            {goal.target_date && (
              <div className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                <span>Due {formatDate(goal.target_date)}</span>
              </div>
            )}
            {goal.weekly_hours && (
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>{goal.weekly_hours}h/week</span>
              </div>
            )}
            <div>
              Created {formatDate(goal.created_at)}
            </div>
          </div>
        </div>
      </CardContent>
      
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
    </Card>
  );
};