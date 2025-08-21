import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, Trophy, Target, TrendingUp, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { useEffect, useState } from "react";
import { useGoalStats } from "@/hooks/useGoalStats";

interface Goal {
  id: string;
  title: string;
  status: 'active' | 'archived' | 'completed';
  modality: 'project' | 'checklist';
  total_tasks: number;
  completed_tasks: number;
  target_date?: string | null;
  weekly_hours?: number | null;
  created_at: string;
  completed_at?: string | null;
  archive_status: 'active' | 'user_archived' | 'system_archived';
}

interface GoalOverviewCardProps {
  goal: Goal;
}

export const GoalOverviewCard = ({ goal }: GoalOverviewCardProps) => {
  const [showCelebration, setShowCelebration] = useState(false);
  const { data: goalStats } = useGoalStats(goal.id);
  
  // Use goalStats completion_rate if available, otherwise calculate manually
  const progress = goalStats?.completion_rate ?? (goal.total_tasks > 0 ? Math.round((goal.completed_tasks / goal.total_tasks) * 100) : 0);

  // Trigger celebration for completed goals
  useEffect(() => {
    if (goal.status === 'completed' && progress === 100) {
      setShowCelebration(true);
      const timer = setTimeout(() => setShowCelebration(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [goal.status, progress]);

  const getProgressMessage = () => {
    if (goal.status === 'completed') {
      return "🎉 Goal completed! Great work!";
    } else if (goal.status === 'archived') {
      return "This goal has been archived";
    } else if (goalStats?.is_overdue) {
      return "⚠️ This goal is overdue - time to catch up!";
    } else if (progress === 0) {
      return "Ready to get started!";
    } else if (progress < 25) {
      return "Just getting started";
    } else if (progress < 50) {
      return "Making good progress";
    } else if (progress < 75) {
      return "More than halfway there!";
    } else if (progress < 100) {
      return "Almost finished!";
    }
    return "In progress";
  };

  const getKeyStats = () => {
    const stats = [];
    
    if (goal.status === 'completed' && goal.completed_at) {
      stats.push({
        icon: Trophy,
        label: "Completed",
        value: format(new Date(goal.completed_at), "PPP")
      });
    } else if (goal.target_date && goal.modality === 'project') {
      const targetDate = new Date(goal.target_date);
      const isOverdue = goalStats?.is_overdue || (targetDate < new Date() && goal.status === 'active');
      
      stats.push({
        icon: isOverdue ? AlertTriangle : Calendar,
        label: isOverdue ? "Overdue" : "Target",
        value: format(targetDate, "PPP"),
        variant: isOverdue ? "destructive" : "default"
      });

      // Show days to target if available from goalStats
      if (goalStats?.days_to_target !== null && goalStats?.days_to_target !== undefined) {
        const daysLabel = goalStats.days_to_target === 0 ? "Today!" : 
                         goalStats.days_to_target === 1 ? "Tomorrow" :
                         goalStats.days_to_target > 0 ? `${goalStats.days_to_target} days left` :
                         `${Math.abs(goalStats.days_to_target)} days overdue`;
        
        stats.push({
          icon: goalStats.days_to_target >= 0 ? Target : AlertTriangle,
          label: "Timeline",
          value: daysLabel,
          variant: goalStats.days_to_target < 0 ? "destructive" : "default"
        });
      }
    }

    // Show remaining tasks if available from goalStats
    if (goalStats?.remaining_tasks !== undefined && goal.status === 'active') {
      stats.push({
        icon: TrendingUp,
        label: "Remaining",
        value: `${goalStats.remaining_tasks} tasks left`
      });
    }

    if (goal.weekly_hours && goal.modality === 'project') {
      stats.push({
        icon: Clock,
        label: "Weekly Goal",
        value: `${goal.weekly_hours}h/week`
      });
    }

    // Add goal age from database if available
    if (goalStats?.days_since_created) {
      stats.push({
        icon: Calendar,
        label: "Age",
        value: `${goalStats.days_since_created} day${goalStats.days_since_created === 1 ? '' : 's'}`
      });
    }

    return stats;
  };

  return (
    <Card className={`${showCelebration ? 'animate-pulse border-success' : ''} relative overflow-hidden`}>
      {showCelebration && (
        <div className="absolute inset-0 bg-gradient-to-r from-success/10 via-success/5 to-transparent pointer-events-none" />
      )}
      
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center justify-between">
          <span>Progress Overview</span>
          {goal.status === 'completed' && (
            <Badge variant="default" className="bg-success text-success-foreground">
              <Trophy className="w-3 h-3 mr-1" />
              Complete
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className={`text-muted-foreground ${goalStats?.is_overdue ? 'text-destructive' : ''}`}>
              {getProgressMessage()}
            </span>
            <span className="font-medium">
              {goalStats?.completed_tasks ?? goal.completed_tasks} / {goalStats?.total_tasks ?? goal.total_tasks} tasks
            </span>
          </div>
          <Progress 
            value={progress} 
            className={`h-3 transition-all duration-500 ${
              goal.status === 'completed' ? 'bg-success/20' : 
              goalStats?.is_overdue ? 'bg-destructive/20' : ''
            }`}
          />
          <div className="text-right text-sm font-medium">
            <span className={goalStats?.is_overdue ? 'text-destructive' : 'text-primary'}>
              {typeof progress === 'number' ? `${progress}%` : `${Math.round(progress)}%`}
            </span>
            {goalStats?.completion_rate && (
              <span className="text-muted-foreground ml-1 text-xs">
                (from database)
              </span>
            )}
          </div>
        </div>

        {/* Key Stats */}
        {getKeyStats().length > 0 && (
          <div className="grid grid-cols-1 gap-2">
            {getKeyStats().map((stat, index) => (
              <div key={index} className="flex items-center gap-2 text-sm">
                <stat.icon className="w-4 h-4 text-muted-foreground shrink-0" />
                <span className="text-muted-foreground">{stat.label}:</span>
                <span className={`font-medium ${
                  stat.variant === 'destructive' ? 'text-destructive' : ''
                }`}>
                  {stat.value}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Modality-specific messaging */}
        {goal.status === 'active' && (
          <div className="text-xs text-muted-foreground bg-muted/50 rounded-md p-2">
            {goal.modality === 'project' 
              ? "📅 This is a time-bound project with scheduled tasks and deadlines."
              : "📝 This is a flexible checklist you can complete at your own pace."
            }
          </div>
        )}
      </CardContent>
    </Card>
  );
};