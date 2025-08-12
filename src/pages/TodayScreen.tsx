import React from 'react';
import { useTodayData } from '@/hooks/useTodayData';
import { useAuth } from '@/hooks/useAuth';
import TodayHeader from '@/components/today/TodayHeader';
import TodayTaskItem from '@/components/today/TodayTaskItem';
import OverdueTasksAccordion from '@/components/today/OverdueTasksAccordion';
import TodayLoadingSkeleton from '@/components/today/TodayLoadingSkeleton';
import { BottomNav } from '@/components/BottomNav';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { Target, CheckCircle, Clock } from 'lucide-react';
import { Navigate } from 'react-router-dom';

const TodayScreen: React.FC = () => {
  const { user } = useAuth();
  const { data: todayData, isLoading, isError, error } = useTodayData();

  // Redirect to login if not authenticated
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto p-4 pb-20">
          <TodayLoadingSkeleton />
        </div>
        <BottomNav />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto p-4 pb-20">
          <TodayHeader />
          <Card className="border-destructive">
            <CardContent className="p-6 text-center">
              <p className="text-destructive mb-2">Failed to load today's tasks</p>
              <p className="text-muted-foreground text-sm">
                {error?.message || 'Please try refreshing the page'}
              </p>
            </CardContent>
          </Card>
        </div>
        <BottomNav />
      </div>
    );
  }

  const { todayTasks, overdueCount } = todayData || { todayTasks: [], overdueCount: 0 };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-4 pb-20">
        <TodayHeader />
        
        {/* Main Today Tasks List */}
        {todayTasks.length > 0 ? (
          <div className="space-y-4 mb-6">
            {todayTasks.map((task, index) => (
              <div key={task.id} style={{ animationDelay: `${index * 100}ms` }}>
                <TodayTaskItem task={task} />
              </div>
            ))}
          </div>
        ) : overdueCount > 0 ? (
          <Card className="mb-6 animate-fade-in">
            <CardContent className="p-8 text-center">
              <div className="flex flex-col items-center gap-4">
                <div className="p-3 bg-warning/10 rounded-full">
                  <Clock className="w-8 h-8 text-warning" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-2">Let's catch up!</h3>
                  <p className="text-muted-foreground text-sm">
                    No new tasks for today, but you have {overdueCount} overdue {overdueCount === 1 ? 'task' : 'tasks'} that need attention.
                    These are tasks where the deadline has actually passed.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="mb-6 animate-fade-in">
            <CardContent className="p-8 text-center">
              <div className="flex flex-col items-center gap-4">
                <div className="p-3 bg-success/10 rounded-full">
                  <CheckCircle className="w-8 h-8 text-success" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-2">All caught up!</h3>
                  <p className="text-muted-foreground text-sm">
                    No tasks scheduled for today. Great work staying on top of your goals!
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Overdue Tasks Accordion */}
        <OverdueTasksAccordion count={overdueCount} />

        {/* Empty State for No Tasks or Overdue */}
        {todayTasks.length === 0 && overdueCount === 0 && (
          <Card className="mt-6 animate-scale-in">
            <CardContent className="p-8 text-center">
              <div className="flex flex-col items-center gap-4">
                <div className="p-4 bg-gradient-to-br from-primary/10 to-accent/10 rounded-full">
                  <Target className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-2">Ready to get started?</h3>
                  <p className="text-muted-foreground text-sm mb-4">
                    Create your first goal and start building momentum towards your dreams.
                  </p>
                  <div className="flex gap-2 justify-center">
                    <div className="px-3 py-1 bg-primary/10 rounded-full text-xs text-primary font-medium">
                      Set goals
                    </div>
                    <div className="px-3 py-1 bg-accent/10 rounded-full text-xs text-accent-foreground font-medium">
                      Track progress
                    </div>
                    <div className="px-3 py-1 bg-success/10 rounded-full text-xs text-success font-medium">
                      Achieve dreams
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
      
      <BottomNav />
    </div>
  );
};

export default TodayScreen;