import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, X } from "lucide-react";
import { format } from "date-fns";

interface DatePickerInChatProps {
  onDateSelect: (date: Date | null) => void;
  onCancel: () => void;
  className?: string;
}

const DatePickerInChat = ({ onDateSelect, onCancel, className = "" }: DatePickerInChatProps) => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [showCalendar, setShowCalendar] = useState(false);

  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date);
    // Keep calendar open to show confirm button
  };

  const handleConfirmDate = () => {
    if (selectedDate) {
      onDateSelect(selectedDate);
    }
  };

  const handleNoDeadline = () => {
    onDateSelect(null);
  };

  if (showCalendar) {
    return (
      <Card className={`border-primary/20 bg-gradient-to-r from-primary/5 to-secondary/5 ${className}`}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <CalendarIcon className="h-5 w-5 text-primary" />
              Pick Your Target Date
            </CardTitle>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setShowCalendar(false)}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={handleDateSelect}
            disabled={(date) => date < new Date()}
            initialFocus
            className="pointer-events-auto"
          />
          
          {selectedDate && (
            <div className="bg-primary/5 rounded-lg p-3 text-center border border-primary/10">
              <p className="text-sm text-muted-foreground">Target date</p>
              <p className="text-lg font-semibold text-primary">
                {format(selectedDate, "MMMM d, yyyy")}
              </p>
              <Button onClick={handleConfirmDate} className="mt-2 w-full">
                That's My Deadline! 🎯
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`border-primary/20 bg-gradient-to-r from-primary/5 to-secondary/5 ${className}`}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <CalendarIcon className="h-5 w-5 text-primary" />
          Do you have a specific date in mind?
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          This helps me create the perfect timeline for your goal.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-1 gap-3">
          <Button
            onClick={() => setShowCalendar(true)}
            className="flex items-center justify-center gap-3 h-auto py-4 px-4"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20">
              <CalendarIcon className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <p className="font-semibold">📅 Pick a Date</p>
              <p className="text-sm opacity-90">I have a specific deadline in mind</p>
            </div>
          </Button>

          <Button
            variant="outline"
            onClick={handleNoDeadline}
            className="flex items-center justify-center gap-3 h-auto py-4 px-4 hover:bg-secondary/5 hover:border-secondary/30"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary/10">
              <span className="text-lg">🔄</span>
            </div>
            <div className="flex-1">
              <p className="font-semibold">No Specific Deadline</p>
              <p className="text-sm text-muted-foreground">This is an ongoing goal</p>
            </div>
          </Button>
        </div>
        
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={onCancel}
          className="w-full text-muted-foreground hover:text-foreground"
        >
          ← Back to conversation
        </Button>
      </CardContent>
    </Card>
  );
};

export default DatePickerInChat;