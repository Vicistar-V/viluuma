import React from 'react';
import { format, getHours } from 'date-fns';
import { useAuth } from '@/hooks/useAuth';
import { AlertTriangle } from 'lucide-react';

interface TodayHeaderProps {
  overdueCount: number;
}

const TodayHeader: React.FC<TodayHeaderProps> = ({ overdueCount }) => {
  const { user } = useAuth();
  const today = new Date();
  const formattedDate = format(today, 'EEEE, MMMM d');
  const currentHour = getHours(today);
  
  // Get time-based greeting
  const getGreeting = () => {
    if (currentHour < 12) {
      return 'Good morning';
    } else if (currentHour < 17) {
      return 'Good afternoon';
    } else {
      return 'Good evening';
    }
  };

  const firstName = user?.user_metadata?.full_name?.split(' ')[0] || 'there';

  // Get context-aware message based on overdue count
  const getContextMessage = () => {
    if (overdueCount === 0) {
      // Perfect state - no overdue tasks
      const dayOfWeek = today.getDay();
      switch (dayOfWeek) {
        case 1: return "Here's your plan for today. Let's start the week strong!";
        case 2: return "Here's your plan for today. Keep building that momentum!";
        case 3: return "Here's your plan for today. Hump day hustle!";
        case 4: return "Here's your plan for today. Almost there!";
        case 5: return "Here's your plan for today. Finish strong!";
        case 6: return "Here's your plan for today. Weekend productivity!";
        case 0: return "Here's your plan for today. Sunday self-care!";
        default: return "Here's your plan for today. Let's make it count!";
      }
    } else if (overdueCount <= 3) {
      // Gentle nudge state
      return "You have a few things to catch up on, but today looks manageable.";
    } else {
      // Overwhelmed state - focus on overdue
      return "It looks like you've fallen a bit behind. That's totally okay! Let's focus on catching up first.";
    }
  };

  return (
    <div className="mb-6 animate-fade-in">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-bold text-foreground">
          {getGreeting()}, {firstName}!
        </h1>
        <div className="text-right">
          <p className="text-sm text-muted-foreground">{formattedDate}</p>
        </div>
      </div>
      
      {/* Context-aware coaching message */}
      <div className="flex items-start gap-2">
        {overdueCount > 10 && (
          <AlertTriangle className="w-4 h-4 text-warning mt-0.5 flex-shrink-0" />
        )}
        <p className={`text-sm font-medium ${
          overdueCount === 0 
            ? 'text-primary' 
            : overdueCount <= 3 
              ? 'text-muted-foreground' 
              : 'text-warning'
        }`}>
          {getContextMessage()}
        </p>
      </div>
    </div>
  );
};

export default TodayHeader;