import { Trophy, TrendingUp, Calendar, Target } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useUserGoalSummary } from "@/hooks/useGoalStats";

export const GoalSummaryCard = () => {
  const { data: summary, isLoading } = useUserGoalSummary();

  if (isLoading || !summary) return null;

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <TrendingUp className="h-4 w-4" />
          Your Goal Summary
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">{summary.active_goals}</div>
            <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
              <Target className="h-3 w-3" />
              Active Goals
            </div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-success">{summary.completed_goals}</div>
            <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
              <Trophy className="h-3 w-3" />
              Completed
            </div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-muted-foreground">{summary.archived_goals}</div>
            <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
              <Calendar className="h-3 w-3" />
              Archived
            </div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-warning">{summary.completion_rate}%</div>
            <div className="text-xs text-muted-foreground">
              Overall Progress
            </div>
          </div>
        </div>
        
        {summary.completion_rate > 0 && (
          <div className="mt-4 text-center">
            <Badge 
              variant={summary.completion_rate > 75 ? 'default' : 'secondary'}
              className={summary.completion_rate > 75 ? 'bg-success text-success-foreground' : ''}
            >
              {summary.completed_tasks} of {summary.total_tasks} tasks completed
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );
};