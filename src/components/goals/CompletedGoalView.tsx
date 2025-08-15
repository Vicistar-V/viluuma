import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Calendar, Clock, Target, Sparkles } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { useEffect, useState } from "react";

interface Task {
  id: string;
  goal_id: string;
  milestone_id: string;
  user_id: string;
  title: string;
  description?: string | null;
  status: 'pending' | 'completed';
  priority?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  duration_hours?: number | null;
  is_anchored: boolean;
}

interface Milestone {
  id: string;
  goal_id: string;
  title: string;
  status: string;
  order_index: number | null;
  total_tasks: number;
  completed_tasks: number;
}

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
  is_archived: boolean;
}

interface CompletedGoalViewProps {
  goal: Goal;
  milestones: Milestone[];
  groupedTasks: Record<string, Task[]>;
}

export const CompletedGoalView = ({ goal, milestones, groupedTasks }: CompletedGoalViewProps) => {
  const [showCelebration, setShowCelebration] = useState(true);

  useEffect(() => {
    // Auto-hide celebration after 5 seconds
    const timer = setTimeout(() => setShowCelebration(false), 5000);
    return () => clearTimeout(timer);
  }, []);

  const getCompletionStats = () => {
    const stats = [];
    
    if (goal.completed_at) {
      const completedDate = new Date(goal.completed_at);
      const createdDate = new Date(goal.created_at);
      const daysTaken = differenceInDays(completedDate, createdDate);
      
      stats.push({
        icon: Calendar,
        label: "Completed",
        value: format(completedDate, "PPP")
      });
      
      stats.push({
        icon: Clock,
        label: "Duration",
        value: `${daysTaken} days`
      });
    }
    
    if (goal.target_date) {
      const targetDate = new Date(goal.target_date);
      const completedDate = new Date(goal.completed_at || new Date());
      const daysDifference = differenceInDays(completedDate, targetDate);
      
      stats.push({
        icon: Target,
        label: daysDifference <= 0 ? "Finished Early" : "Finished Late",
        value: daysDifference <= 0 
          ? `${Math.abs(daysDifference)} days early` 
          : `${daysDifference} days late`,
        variant: daysDifference <= 0 ? 'success' : 'warning'
      });
    }
    
    stats.push({
      icon: Trophy,
      label: "Tasks Completed",
      value: `${goal.total_tasks} tasks`
    });
    
    return stats;
  };

  return (
    <div className="space-y-6">
      {/* Celebration Header */}
      {showCelebration && (
        <Card className="bg-gradient-to-br from-success/10 via-background to-success/5 border-success/30 animate-fade-in">
          <CardContent className="pt-6">
            <div className="text-center space-y-3">
              <div className="text-6xl">🎉</div>
              <h2 className="text-2xl font-bold text-success">Goal Completed!</h2>
              <p className="text-muted-foreground">
                Congratulations on completing "{goal.title}". You've accomplished something amazing!
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Completion Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-success" />
            Completion Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {getCompletionStats().map((stat, index) => (
              <div key={index} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                <div className="p-2 rounded-md bg-background">
                  <stat.icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">{stat.label}</div>
                  <div className={`font-medium ${
                    stat.variant === 'success' ? 'text-success' :
                    stat.variant === 'warning' ? 'text-warning' :
                    ''
                  }`}>
                    {stat.value}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Achievement Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            What You Achieved
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {milestones.map((milestone) => {
            const milestoneTasks = groupedTasks[milestone.id] || [];
            
            return (
              <div key={milestone.id} className="space-y-3">
                <div className="flex items-center gap-2">
                  <Badge variant="default" className="bg-success text-success-foreground">
                    ✓ Complete
                  </Badge>
                  <h3 className="font-medium text-success line-through">
                    {milestone.title}
                  </h3>
                  <span className="text-sm text-muted-foreground">
                    ({milestone.total_tasks} tasks)
                  </span>
                </div>
                
                <div className="ml-6 space-y-1">
                  {milestoneTasks.map((task) => (
                    <div key={task.id} className="flex items-center gap-2 text-sm">
                      <div className="w-4 h-4 rounded-sm bg-success/20 flex items-center justify-center">
                        <div className="w-2 h-2 rounded-sm bg-success" />
                      </div>
                      <span className="text-muted-foreground line-through">
                        {task.title}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Motivation Message */}
      <Card className="bg-gradient-to-br from-primary/5 via-background to-accent/5 border-primary/20">
        <CardContent className="pt-6">
          <div className="text-center space-y-3">
            <h3 className="font-semibold text-primary">You did it! 🌟</h3>
            <p className="text-muted-foreground">
              This completed goal is proof of your dedication and capability. 
              Use this momentum to tackle your next ambition!
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};