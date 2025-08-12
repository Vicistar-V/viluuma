import React from 'react';
import { format, getHours } from 'date-fns';
import { useAuth } from '@/hooks/useAuth';
import { useUserData } from '@/hooks/useUserData';
import { AlertTriangle } from 'lucide-react';

interface TodayHeaderProps {
  overdueCount: number;
}

const TodayHeader: React.FC<TodayHeaderProps> = ({ overdueCount }) => {
  const { user } = useAuth();
  const { data: userData } = useUserData();
  const today = new Date();
  const formattedDate = format(today, 'EEEE, MMMM d');
  const currentHour = getHours(today);
  
  const firstName = userData?.profile?.display_name?.split(' ')[0] || 
                   user?.user_metadata?.display_name?.split(' ')[0] || 
                   'there';

  // Get greeting with name
  const getGreeting = () => {
    const timeGreeting = currentHour < 12 ? 'Good morning' : currentHour < 17 ? 'Good afternoon' : 'Good evening';
    return `${timeGreeting}, ${firstName}`;
  };

  // Get context-aware message based on overdue count
  const getContextMessage = () => {
    if (overdueCount === 0) {
      return "Your day is clear and ready to go!";
    } else if (overdueCount <= 5) {
      return "A few things need attention, but you've got this";
    } else {
      return "Let's tackle the backlog one step at a time";
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
    <div className="mb-6 animate-fade-in">
      {/* Date */}
      <p className="text-xs text-muted-foreground mb-1">{formattedDate}</p>
      
      {/* Greeting Title */}
      <h1 className="text-xl font-semibold text-foreground mb-2">
        {getGreeting()}
      </h1>
      
      {/* Context Message */}
      <div className={`flex items-center gap-2 ${
        isOverwhelmed 
          ? 'p-2 bg-warning/5 border border-warning/20 rounded-md' 
          : ''
      }`}>
        {headerIcon && (
          <span className="text-sm" role="img" aria-label="status-icon">
            {headerIcon}
          </span>
        )}
        <p className={`text-sm ${textColor} ${isOverwhelmed ? 'text-warning-foreground' : ''}`}>
          {getContextMessage()}
        </p>
      </div>
    </div>
  );
};

export default TodayHeader;