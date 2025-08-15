import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Lock, ArrowRight, Target } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Goal } from '@/hooks/useGoals';

interface ArchivedGoalsSectionProps {
  archivedGoals: Goal[];
}

export const ArchivedGoalsSection = ({ archivedGoals }: ArchivedGoalsSectionProps) => {
  const navigate = useNavigate();

  if (!archivedGoals?.length) return null;

  const handleGoalClick = (goalId: string) => {
    navigate(`/progress-foregone/${goalId}`);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2">
        <Lock className="w-4 h-4 text-muted-foreground" />
        <h3 className="text-lg font-semibold text-muted-foreground">
          Archived Goals
        </h3>
        <Badge variant="outline" className="text-xs">
          {archivedGoals.length}
        </Badge>
      </div>

      <div className="space-y-3">
        {archivedGoals.map((goal) => (
          <Card 
            key={goal.id}
            className="p-4 border-dashed border-muted-foreground/30 bg-muted/20 cursor-pointer hover:bg-muted/40 transition-colors"
            onClick={() => handleGoalClick(goal.id)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-full bg-muted-foreground/20 flex items-center justify-center">
                  <Target className="w-4 h-4 text-muted-foreground" />
                </div>
                
                <div>
                  <h4 className="font-medium text-muted-foreground line-through">
                    {goal.title}
                  </h4>
                  <p className="text-sm text-muted-foreground/70">
                    {goal.completed_tasks} of {goal.total_tasks} tasks completed
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Lock className="w-4 h-4 text-muted-foreground" />
                <ArrowRight className="w-4 h-4 text-muted-foreground" />
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Card className="p-4 border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
        <div className="text-center space-y-2">
          <p className="text-sm font-medium">
            Want to continue these goals?
          </p>
          <p className="text-xs text-muted-foreground">
            Upgrade to Pro to reactivate all your archived goals
          </p>
          <Button size="sm" className="mt-2">
            Upgrade Now
          </Button>
        </div>
      </Card>
    </div>
  );
};