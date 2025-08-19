import React from 'react';
import { TaskReminderManager } from '@/components/notifications/TaskReminderManager';
import { BottomNav } from '@/components/BottomNav';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const TaskReminderManagerScreen: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
              className="h-9 w-9"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-lg font-semibold">Task Reminders</h1>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 pb-28">
        <TaskReminderManager />
      </main>

      <BottomNav />
    </div>
  );
};

export default TaskReminderManagerScreen;