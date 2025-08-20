import { Goal } from '@/hooks/useGoals';
import { GoalCard } from './GoalCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Archive, Trash2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';

interface ArchivedGoalsSectionProps {
  archivedGoals: Goal[];
  onUnarchive: (goalId: string) => void;
  onPermanentDelete: (goalId: string) => void;
}

export const ArchivedGoalsSection = ({ archivedGoals, onUnarchive, onPermanentDelete }: ArchivedGoalsSectionProps) => {
  const [goalToDelete, setGoalToDelete] = useState<Goal | null>(null);

  if (archivedGoals.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <Card className="border-muted bg-muted/30">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-muted-foreground">
            <Archive className="h-5 w-5" />
            Archived Goals ({archivedGoals.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {archivedGoals.map((goal) => (
            <Card key={goal.id} className="border-muted bg-background/60">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <Link 
                        to={`/goals/${goal.id}`}
                        className="hover:text-primary transition-colors"
                      >
                        <h3 className="font-medium text-foreground hover:underline cursor-pointer">
                          {goal.title}
                        </h3>
                      </Link>
                      <Badge variant="secondary" className="text-xs">
                        {goal.modality}
                      </Badge>
                    </div>
                    
                    {goal.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {goal.description}
                      </p>
                    )}
                    
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>
                        Archived {format(new Date(goal.updated_at), 'MMM d, yyyy')}
                      </span>
                      <span>
                        {goal.completed_tasks}/{goal.total_tasks} tasks completed
                      </span>
                      {goal.target_date && (
                        <span>
                          Target: {format(new Date(goal.target_date), 'MMM d, yyyy')}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onUnarchive(goal.id)}
                      className="text-xs"
                    >
                      <RefreshCw className="h-3 w-3 mr-1" />
                      Unarchive
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setGoalToDelete(goal)}
                      className="text-xs"
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Delete
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </CardContent>
      </Card>

      <AlertDialog open={!!goalToDelete} onOpenChange={() => setGoalToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Permanently Delete Goal?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete "{goalToDelete?.title}" 
              and all associated milestones and tasks ({goalToDelete?.total_tasks} tasks total).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (goalToDelete) {
                  onPermanentDelete(goalToDelete.id);
                  setGoalToDelete(null);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};