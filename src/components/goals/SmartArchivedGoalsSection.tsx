import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Archive, 
  Lock, 
  Calendar, 
  Target, 
  CheckCircle2, 
  RotateCcw,
  Trash2,
  Crown
} from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useState } from 'react';
import { UpgradePrompt } from '@/components/paywall/UpgradePrompt';
import { useSubscription } from '@/hooks/useSubscription';
import { Link } from 'react-router-dom';

interface Goal {
  id: string;
  title: string;
  description: string | null;
  modality: 'project' | 'checklist';
  status: 'active' | 'archived' | 'completed';
  total_tasks: number;
  completed_tasks: number;
  target_date?: string | null;
  weekly_hours?: number | null;
  created_at: string;
  completed_at?: string | null;
  archive_status: 'active' | 'user_archived' | 'system_archived';
}

interface SmartArchivedGoalsSectionProps {
  userArchivedGoals: Goal[];
  systemArchivedGoals: Goal[];
  onUnarchive: (goalId: string) => void;
  onPermanentDelete: (goalId: string) => void;
}

export const SmartArchivedGoalsSection = ({ 
  userArchivedGoals, 
  systemArchivedGoals,
  onUnarchive, 
  onPermanentDelete 
}: SmartArchivedGoalsSectionProps) => {
  const [goalToDelete, setGoalToDelete] = useState<Goal | null>(null);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const subscription = useSubscription();

  const handleSystemGoalClick = (goal: Goal) => {
    if (subscription.entitlement === 'free') {
      setShowUpgrade(true);
    } else {
      onUnarchive(goal.id);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getProgressPercentage = (goal: Goal) => {
    if (goal.total_tasks === 0) return 0;
    return Math.round((goal.completed_tasks / goal.total_tasks) * 100);
  };

  if (userArchivedGoals.length === 0 && systemArchivedGoals.length === 0) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* System Archived Goals (Locked) */}
      {systemArchivedGoals.length > 0 && (
        <Card className="border-warning/20 bg-warning/5">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-warning" />
              <CardTitle className="text-warning">Locked Goals</CardTitle>
              <Badge variant="outline" className="border-warning/20 text-warning">
                {systemArchivedGoals.length}
              </Badge>
            </div>
            <CardDescription>
              These goals were automatically archived due to plan limits. 
              {subscription.entitlement === 'free' && ' Upgrade to Pro to unlock them instantly.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {systemArchivedGoals.map((goal) => (
              <div 
                key={goal.id}
                className={`p-4 rounded-lg border border-warning/20 bg-background/50 ${
                  subscription.entitlement === 'free' ? 'cursor-pointer hover:bg-warning/5' : ''
                }`}
                onClick={() => handleSystemGoalClick(goal)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <Link 
                        to={`/goals/${goal.id}`}
                        className="hover:text-primary transition-colors"
                      >
                        <h4 className="font-medium text-sm truncate hover:underline cursor-pointer">
                          {goal.title}
                        </h4>
                      </Link>
                      <Badge variant="outline">
                        {goal.modality}
                      </Badge>
                      {subscription.entitlement === 'free' && (
                        <Crown className="h-3 w-3 text-warning shrink-0" />
                      )}
                    </div>
                    {goal.description && (
                      <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                        {goal.description}
                      </p>
                    )}
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Target className="h-3 w-3" />
                        {goal.completed_tasks}/{goal.total_tasks} tasks
                        {goal.total_tasks > 0 && (
                          <span className="text-primary font-medium">
                            ({getProgressPercentage(goal)}%)
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Created {formatDate(goal.created_at)}
                      </div>
                    </div>
                  </div>
                  {subscription.entitlement === 'pro' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onUnarchive(goal.id);
                      }}
                    >
                      <RotateCcw className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
            
            {subscription.entitlement === 'free' && (
              <div className="pt-2">
                <UpgradePrompt
                  variant="inline"
                  trigger="archive_limit"
                  description="Unlock these goals and get unlimited goal creation with Pro."
                />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* User Archived Goals */}
      {userArchivedGoals.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Archive className="h-5 w-5 text-muted-foreground" />
              <CardTitle>Archived Goals</CardTitle>
              <Badge variant="outline">
                {userArchivedGoals.length}
              </Badge>
            </div>
            <CardDescription>
              Goals you've manually archived for organization.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {userArchivedGoals.map((goal) => (
              <div key={goal.id} className="p-4 rounded-lg border bg-muted/30">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <Link 
                        to={`/goals/${goal.id}`}
                        className="hover:text-primary transition-colors"
                      >
                        <h4 className="font-medium text-sm truncate hover:underline cursor-pointer">
                          {goal.title}
                        </h4>
                      </Link>
                      <Badge variant="outline">
                        {goal.modality}
                      </Badge>
                      {goal.status === 'completed' && (
                        <Badge variant="default" className="bg-success/10 text-success border-success/20">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Complete
                        </Badge>
                      )}
                    </div>
                    {goal.description && (
                      <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                        {goal.description}
                      </p>
                    )}
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Target className="h-3 w-3" />
                        {goal.completed_tasks}/{goal.total_tasks} tasks
                        {goal.total_tasks > 0 && (
                          <span className="text-primary font-medium">
                            ({getProgressPercentage(goal)}%)
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {goal.completed_at ? `Completed ${formatDate(goal.completed_at)}` : `Created ${formatDate(goal.created_at)}`}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onUnarchive(goal.id)}
                    >
                      <RotateCcw className="h-3 w-3 mr-1" />
                      Unarchive
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete "{goal.title}"?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently delete this goal and all its tasks and milestones. 
                            This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={() => onPermanentDelete(goal.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Delete Permanently
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <UpgradePrompt
        variant="card"
        trigger="archive_limit"
        title="Unlock Your Archived Goals"
        description="Upgrade to Pro to instantly reactivate your locked goals and get unlimited goal creation."
        className={showUpgrade ? 'block' : 'hidden'}
      />
    </div>
  );
};