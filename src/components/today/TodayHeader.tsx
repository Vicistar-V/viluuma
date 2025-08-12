import React from 'react';
import { format } from 'date-fns';

const TodayHeader: React.FC = () => {
  const today = new Date();
  const formattedDate = format(today, 'EEEE, MMMM d');

  return (
    <div className="mb-6">
      <h1 className="text-2xl font-bold text-foreground mb-1">Today</h1>
      <p className="text-muted-foreground text-sm">{formattedDate}</p>
    </div>
  );
};

export default TodayHeader;