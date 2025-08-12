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

  // Get context-aware message and UI state based on overdue count
  const getContextMessage = () => {
    if (overdueCount === 0) {
      // Perfect state - no overdue tasks (Happy and positive)
      return `Happy ${format(today, 'EEEE')}, ${firstName}! Here is your clear path for today.`;
    } else if (overdueCount <= 5) {
      // Gentle nudge state (Include subtle guidance)
      return `Good ${getGreeting().split(' ')[1]}, ${firstName}! You have a few things to catch up on below, but first, here is today's plan.`;
    } else {
      // Overwhelmed state - proactive coaching (Empathetic and directive)
      return `Hey ${firstName}, it looks like things are piling up, and that's completely okay. Don't worry about the tasks below for a second. The most important thing is to just get started. Let's focus on clearing one or two things from your 'Overdue' list to get the momentum back.`;
    }
  };

  // Get header visual treatment based on overdue count
  const getHeaderIcon = () => {
    if (overdueCount === 0) {
      return null; // Clean and simple
    } else if (overdueCount <= 5) {
      return "💡"; // Gentle, friendly guidance
    } else {
      return "⚠️"; // More direct but still warm
    }
  };

  // Get text color treatment
  const getTextColor = () => {
    if (overdueCount === 0) {
      return "text-primary";
    } else if (overdueCount <= 5) {
      return "text-muted-foreground";
    } else {
      return "text-warning";
    }
  };

  const headerIcon = getHeaderIcon();
  const textColor = getTextColor();
  const isOverwhelmed = overdueCount > 5;

  return (
    <div className={`mb-6 animate-fade-in ${isOverwhelmed ? 'coaching-card' : ''}`}>
      {/* Main Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {headerIcon && (
            <span className="text-lg animate-gentle-pulse" role="img" aria-label="status-icon">
              {headerIcon}
            </span>
          )}
          <div>
            <p className="text-sm text-muted-foreground">{formattedDate}</p>
          </div>
        </div>
      </div>
      
      {/* Compact Message */}
      <div className={`${
        isOverwhelmed 
          ? 'p-3 bg-warning/5 border border-warning/20 rounded-lg' 
          : ''
      }`}>
        <p className={`text-sm font-medium ${textColor} ${isOverwhelmed ? 'text-warning-foreground' : ''}`}>
          {getContextMessage()}
        </p>
      </div>
    </div>
  );
};

export default TodayHeader;