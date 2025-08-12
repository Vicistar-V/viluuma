import React from 'react';
import { 
  Accordion, 
  AccordionContent, 
  AccordionItem, 
  AccordionTrigger 
} from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Clock } from 'lucide-react';
import { useOverdueTasks } from '@/hooks/useTodayData';
import TodayTaskItem from './TodayTaskItem';
import { Skeleton } from '@/components/ui/skeleton';

interface OverdueTasksAccordionProps {
  count: number;
}

const OverdueTasksAccordion: React.FC<OverdueTasksAccordionProps> = ({ count }) => {
  const { data: overdueTasks, isLoading, refetch } = useOverdueTasks();

  if (count === 0) {
    return null; // Don't show accordion if no overdue tasks
  }

  const handleAccordionOpenChange = (isOpen: boolean) => {
    if (isOpen && !overdueTasks) {
      // Fetch overdue tasks when accordion opens for the first time
      refetch();
    }
  };

  return (
    <div className="mt-6">
      <Accordion type="single" collapsible onValueChange={(value) => handleAccordionOpenChange(!!value)}>
        <AccordionItem value="overdue-tasks" className="border border-destructive/20 rounded-lg">
          <AccordionTrigger className="px-4 py-3 hover:no-underline">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-destructive" />
              <span className="font-medium text-foreground">Overdue Tasks</span>
              <Badge variant="destructive" className="ml-2">
                {count}
              </Badge>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: Math.min(count, 3) }).map((_, index) => (
                  <Skeleton key={index} className="h-20 w-full" />
                ))}
              </div>
            ) : overdueTasks && overdueTasks.length > 0 ? (
              <div className="space-y-3">
                {overdueTasks.map((task) => (
                  <TodayTaskItem 
                    key={task.id} 
                    task={{
                      id: task.id,
                      goal_id: task.goal_id,
                      title: task.title,
                      description: task.description,
                      status: task.status as 'pending' | 'completed',
                      start_date: task.start_date,
                      end_date: task.end_date,
                      priority: task.priority as 'high' | 'medium' | 'low' | null,
                      is_anchored: task.is_anchored,
                      goal_title: task.goal_title,
                      task_type: 'overdue'
                    }} 
                  />
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm text-center py-4">
                No overdue tasks found.
              </p>
            )}
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
};

export default OverdueTasksAccordion;