import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, Trophy, Target } from "lucide-react";
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
  const progress = goal.total_tasks > 0 ? Math.round((goal.completed_tasks / goal.total_tasks) * 100) : 0;

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
        icon: Calendar,
        label: isOverdue ? "Overdue" : "Target",
        value: format(targetDate, "PPP"),
        variant: isOverdue ? "destructive" : "default"
      });
    }

    if (goal.weekly_hours && goal.modality === 'project') {
      stats.push({
        icon: Clock,
        label: "Weekly Goal",
        value: `${goal.weekly_hours}h/week`
      });
    }

    if (goal.status === 'active') {
      stats.push({
        icon: Target,
        label: "Status",
        value: goal.modality === 'project' ? "Time-bound Project" : "Flexible Checklist"
      });
    }

    // Add statistics from database if available
    if (goalStats) {
      if (goalStats.days_since_created) {
        stats.push({
          icon: Calendar,
          label: "Age",
          value: `${goalStats.days_since_created} days`
        });
      }
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
            <span className="text-muted-foreground">{getProgressMessage()}</span>
            <span className="font-medium">{goal.completed_tasks} / {goal.total_tasks} tasks</span>
          </div>
          <Progress 
            value={progress} 
            className={`h-3 transition-all duration-500 ${
              goal.status === 'completed' ? 'bg-success/20' : ''
            }`}
          />
          <div className="text-right text-sm font-medium text-primary">
            {progress}%
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