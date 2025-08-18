import { useState, useEffect } from 'react';
import { Bell, BellRing, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useNotifications } from '@/hooks/useNotifications';

interface TaskReminderButtonProps {
  taskId: string;
  taskTitle: string;
}

export const TaskReminderButton = ({ taskId, taskTitle }: TaskReminderButtonProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [hasReminder, setHasReminder] = useState(false);
  const [reminderTime, setReminderTime] = useState('');
  const { scheduleTaskReminder, cancelTaskReminder, checkTaskReminderExists } = useNotifications();

  // Check if reminder exists when component mounts
  useEffect(() => {
    const checkReminder = async () => {
      const exists = await checkTaskReminderExists(taskId);
      setHasReminder(exists);
    };
    checkReminder();
  }, [taskId, checkTaskReminderExists]);

  const handleSetReminder = async () => {
    if (!reminderTime) return;

    const [hours, minutes] = reminderTime.split(':');
    const reminderDate = new Date();
    reminderDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);

    // If the time is in the past, set it for tomorrow
    if (reminderDate < new Date()) {
      reminderDate.setDate(reminderDate.getDate() + 1);
    }

    await scheduleTaskReminder(taskId, taskTitle, reminderDate);
    setHasReminder(true);
    setIsOpen(false);
  };

  const handleCancelReminder = async () => {
    await cancelTaskReminder(taskId);
    setHasReminder(false);
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm"
          className={hasReminder ? "text-primary" : "text-muted-foreground"}
        >
          {hasReminder ? <BellRing className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Task Reminder
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground mb-2">Task:</p>
            <p className="font-medium">{taskTitle}</p>
          </div>

          {hasReminder ? (
            <div className="space-y-4">
              <p className="text-sm text-green-600 flex items-center gap-2">
                <BellRing className="h-4 w-4" />
                Reminder is set for this task
              </p>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleCancelReminder} className="flex-1">
                  Cancel Reminder
                </Button>
                <Button onClick={() => setIsOpen(false)} className="flex-1">
                  Close
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label htmlFor="reminderTime" className="text-sm font-medium">
                  Set reminder time:
                </label>
                <input
                  id="reminderTime"
                  type="time"
                  value={reminderTime}
                  onChange={(e) => setReminderTime(e.target.value)}
                  className="w-full mt-1 p-2 border rounded-md"
                />
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => setIsOpen(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleSetReminder}
                  disabled={!reminderTime}
                  className="flex-1"
                >
                  Set Reminder
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};