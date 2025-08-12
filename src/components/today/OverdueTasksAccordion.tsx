import React, { useState } from 'react';
import { 
  Accordion, 
  AccordionContent, 
  AccordionItem, 
  AccordionTrigger 
} from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Clock } from 'lucide-react';
import { useOverdueTasks } from '@/hooks/useTodayData';
import TodayTaskItem from './TodayTaskItem';
import { Skeleton } from '@/components/ui/skeleton';

interface OverdueTasksAccordionProps {
  count: number;
}

const OverdueTasksAccordion: React.FC<OverdueTasksAccordionProps> = ({ count }) => {
  const [hasOpened, setHasOpened] = useState(false);
  const {
    data: overdueTasks,
    isLoading,
    isError,
    refetch
  } = useOverdueTasks();

  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen && !hasOpened) {
      setHasOpened(true);
      refetch();
    }
  };

  if (count === 0) return null;

  return (
    <div className="mt-6">
      <Accordion 
        type="single" 
        collapsible 
        className="w-full animate-fade-in"
        onValueChange={(value) => handleOpenChange(!!value)}
      >
        <AccordionItem value="overdue-tasks" className="border border-warning/20 rounded-lg">
          <AccordionTrigger className="px-4 py-3 hover:no-underline bg-warning/5 rounded-lg hover:bg-warning/10 transition-colors">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-warning" />
              <span className="font-medium text-foreground">
                Overdue Tasks
              </span>
              <Badge variant="secondary" className="ml-2 bg-warning/20 text-warning border-warning/30">
                {count}
              </Badge>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            {isLoading ? (
              <div className="space-y-3 mt-4">
                {Array.from({ length: Math.min(count, 3) }).map((_, index) => (
                  <Card key={index} className="animate-pulse overdue-glow">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <Skeleton className="w-5 h-5 rounded mt-1" />
                        <div className="flex-1">
                          <div className="flex gap-2 mb-2">
                            <Skeleton className="h-5 w-16 rounded-full" />
                            <Skeleton className="h-5 w-12 rounded-full" />
                          </div>
                          <Skeleton className="h-5 w-full mb-2" />
                          <div className="flex justify-between items-center">
                            <Skeleton className="h-3 w-20" />
                            <Skeleton className="h-3 w-24" />
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : isError ? (
              <div className="mt-4">
                <Card className="border-destructive">
                  <CardContent className="p-4 text-center">
                    <p className="text-destructive text-sm">
                      Failed to load overdue tasks. Please try again.
                    </p>
                  </CardContent>
                </Card>
              </div>
            ) : overdueTasks && overdueTasks.length > 0 ? (
              <div className="space-y-3 mt-4">
                {overdueTasks.map((task, index) => (
                  <div key={task.id} style={{ animationDelay: `${index * 100}ms` }}>
                    <TodayTaskItem 
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
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-4">
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-muted-foreground text-sm">
                      No overdue tasks found. You might have completed them all!
                    </p>
                  </CardContent>
                </Card>
              </div>
            )}
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
};

export default OverdueTasksAccordion;