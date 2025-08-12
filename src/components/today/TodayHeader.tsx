import React from 'react';
import { format, getHours } from 'date-fns';
import { useAuth } from '@/hooks/useAuth';

const TodayHeader: React.FC = () => {
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

  // Get day-specific motivation
  const getDayMotivation = () => {
    const dayOfWeek = today.getDay();
    
    switch (dayOfWeek) {
      case 1: // Monday
        return "Let's start the week strong! 💪";
      case 2: // Tuesday
        return "Building momentum! 🚀";
      case 3: // Wednesday
        return "Hump day hustle! ⚡";
      case 4: // Thursday
        return "Almost there! 🎯";
      case 5: // Friday
        return "Finish strong! 🏆";
      case 6: // Saturday
        return "Weekend productivity! ✨";
      case 0: // Sunday
        return "Sunday self-care! 🌱";
      default:
        return "Let's make today count! 🌟";
    }
  };

  const firstName = user?.user_metadata?.full_name?.split(' ')[0] || 'there';

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
      <p className="text-sm text-primary font-medium">
        {getDayMotivation()}
      </p>
    </div>
  );
};

export default TodayHeader;