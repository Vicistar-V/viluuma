import React from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Clock, Calendar, Target } from 'lucide-react';
import { TodayTask, useCompleteTask, useUncompleteTask } from '@/hooks/useTodayData';
import { format } from 'date-fns';

interface TodayTaskItemProps {
  task: TodayTask;
}

const TodayTaskItem: React.FC<TodayTaskItemProps> = ({ task }) => {
  const completeTaskMutation = useCompleteTask();
  const uncompleteTaskMutation = useUncompleteTask();

  const handleCheckboxChange = (checked: boolean) => {
    if (checked) {
      completeTaskMutation.mutate(task.id);
    } else {
      uncompleteTaskMutation.mutate(task.id);
    }
  };

  const getTaskTypeDisplay = () => {
    switch (task.task_type) {
      case 'overdue':
        return (
          <Badge variant="destructive" className="text-xs">
            <Clock className="w-3 h-3 mr-1" />
            Overdue
          </Badge>
        );
      case 'scheduled':
        return task.start_date ? (
          <Badge variant="secondary" className="text-xs">
            <Calendar className="w-3 h-3 mr-1" />
            Today
          </Badge>
        ) : null;
      case 'checklist':
        return (
          <Badge variant="outline" className="text-xs">
            <Target className="w-3 h-3 mr-1" />
            Feeling motivated?
          </Badge>
        );
      default:
        return null;
    }
  };

  const getPriorityColor = () => {
    switch (task.priority) {
      case 'high':
        return 'border-l-destructive';
      case 'medium':
        return 'border-l-warning';
      case 'low':
        return 'border-l-muted';
      default:
        return 'border-l-muted';
    }
  };

  const isCompleted = task.status === 'completed';

  return (
    <Card className={`transition-all duration-200 hover:shadow-md border-l-4 ${getPriorityColor()} ${
      isCompleted ? 'opacity-60' : ''
    }`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Checkbox
            checked={isCompleted}
            onCheckedChange={handleCheckboxChange}
            disabled={completeTaskMutation.isPending || uncompleteTaskMutation.isPending}
            className="mt-1 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
          />
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              {getTaskTypeDisplay()}
              {task.priority && (
                <Badge 
                  variant="outline" 
                  className={`text-xs ${
                    task.priority === 'high' ? 'border-destructive text-destructive' :
                    task.priority === 'medium' ? 'border-warning text-warning' :
                    'border-muted-foreground text-muted-foreground'
                  }`}
                >
                  {task.priority}
                </Badge>
              )}
            </div>
            
            <h3 className={`font-medium mb-1 ${isCompleted ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
              {task.title}
            </h3>
            
            {task.description && (
              <p className={`text-sm mb-2 ${isCompleted ? 'line-through text-muted-foreground' : 'text-muted-foreground'}`}>
                {task.description}
              </p>
            )}
            
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-medium">
                {task.goal_title}
              </span>
              
              {task.start_date && task.task_type === 'overdue' && (
                <span className="text-xs text-destructive">
                  Due {format(new Date(task.start_date), 'MMM d')}
                </span>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default TodayTaskItem;