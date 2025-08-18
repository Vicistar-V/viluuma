import { useState, useEffect } from 'react';
import { Bell, BellRing, Clock, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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

  const getCurrentTime = () => {
    const now = new Date();
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = (now.getMinutes() + 15).toString().padStart(2, '0'); // Default to 15 minutes from now
    return `${hours}:${minutes}`;
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={`text-muted-foreground hover:text-foreground ${hasReminder ? 'text-primary' : ''}`}
        >
          {hasReminder ? <BellRing className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-4">
          <div className="space-y-2">
            <h4 className="font-medium leading-none">Task Reminder</h4>
            <p className="text-sm text-muted-foreground">
              {hasReminder ? 'Manage reminder for this task' : 'Set a reminder for this task'}
            </p>
          </div>
          
          {hasReminder ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <BellRing className="h-4 w-4 text-primary" />
                <span>Reminder is active</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancelReminder}
                className="w-full"
              >
                <X className="h-4 w-4 mr-2" />
                Cancel Reminder
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="time">Reminder Time</Label>
                <Input
                  id="time"
                  type="time"
                  value={reminderTime}
                  onChange={(e) => setReminderTime(e.target.value)}
                  placeholder={getCurrentTime()}
                />
                <p className="text-xs text-muted-foreground">
                  If time is earlier than now, reminder will be set for tomorrow
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleSetReminder}
                  disabled={!reminderTime}
                  className="flex-1"
                >
                  <Clock className="h-4 w-4 mr-2" />
                  Set Reminder
                </Button>
              </div>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};