import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Clock, Calendar, Sparkles, CalendarDays } from "lucide-react";
import { DailyBudget, CommitmentData } from "@/types/onboarding";

interface CommitmentProfileUIProps {
  onCommitmentSet: (commitment: CommitmentData) => void;
  className?: string;
}

const CommitmentProfileUI = ({ onCommitmentSet, className = "" }: CommitmentProfileUIProps) => {
  const [commitmentType, setCommitmentType] = useState<"weekly" | "custom">("weekly"); // Default to weekly goal
  const [selectedHours, setSelectedHours] = useState(2);
  const [dailyBudget, setDailyBudget] = useState<DailyBudget>({
    mon: 2, tue: 2, wed: 2, thu: 2, fri: 2, sat: 0, sun: 0
  });

  const weeklyOptions = [
    { dailyHours: 1, label: "1 hr/day", description: "Light commitment", weeklyTotal: "5 hrs/week" },
    { dailyHours: 2, label: "2 hrs/day", description: "Steady progress", weeklyTotal: "10 hrs/week" },
    { dailyHours: 4, label: "4 hrs/day", description: "Intensive focus", weeklyTotal: "20 hrs/week" },
    { dailyHours: 8, label: "8 hrs/day", description: "Full dedication", weeklyTotal: "40 hrs/week" },
  ];

  const handleWeeklyChoice = () => {
    setCommitmentType("weekly");
  };

  const handleCustomChoice = () => {
    setCommitmentType("custom");
  };

  const handleWeeklySelect = (dailyHours: number) => {
    const totalWeeklyHours = dailyHours * 5; // 5 weekdays
    const newDailyBudget: DailyBudget = {
      mon: dailyHours, tue: dailyHours, wed: dailyHours, thu: dailyHours, fri: dailyHours,
      sat: 0, sun: 0
    };
    setDailyBudget(newDailyBudget);
    
    const commitment: CommitmentData = {
      type: "daily",
      dailyBudget: newDailyBudget,
      totalHoursPerWeek: totalWeeklyHours
    };
    onCommitmentSet(commitment);
  };

  const handleCustomSlider = (value: number[]) => {
    const hours = value[0];
    setSelectedHours(hours);
    // Update daily budget for weekdays
    const newDailyBudget: DailyBudget = {
      mon: hours, tue: hours, wed: hours, thu: hours, fri: hours,
      sat: 0, sun: 0
    };
    setDailyBudget(newDailyBudget);
  };

  const handleDayChange = (day: keyof DailyBudget, hours: number) => {
    setDailyBudget(prev => ({ ...prev, [day]: hours }));
  };

  const calculateTotalWeeklyHours = (budget: DailyBudget): number => {
    return Object.values(budget).reduce((sum, hours) => sum + hours, 0);
  };

  const handleCustomConfirm = () => {
    const commitment: CommitmentData = {
      type: "daily",
      dailyBudget,
      totalHoursPerWeek: calculateTotalWeeklyHours(dailyBudget)
    };
    onCommitmentSet(commitment);
  };

  const dayLabels = {
    mon: "Mon", tue: "Tue", wed: "Wed", thu: "Thu", 
    fri: "Fri", sat: "Sat", sun: "Sun"
  };


  // Weekly Goal Selection
  if (commitmentType === "weekly") {
    return (
      <Card className={`border-primary/20 bg-gradient-to-r from-primary/5 to-secondary/5 ${className}`}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Clock className="h-5 w-5 text-primary" />
            Daily Time Commitment
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Choose how many hours you can dedicate each day.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Weekly Options */}
          <div className="grid grid-cols-2 gap-3">
            {weeklyOptions.map((option) => (
              <Button
                key={option.dailyHours}
                variant="outline"
                className="flex flex-col h-auto py-4 px-3 hover:bg-primary/5 hover:border-primary/30"
                onClick={() => handleWeeklySelect(option.dailyHours)}
              >
                <span className="font-semibold text-lg">{option.label}</span>
                <span className="text-xs opacity-80">{option.description}</span>
                <span className="text-xs text-primary font-medium">{option.weeklyTotal}</span>
              </Button>
            ))}
          </div>

          {/* Switch to Daily Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCommitmentType("custom")}
            className="w-full text-muted-foreground hover:text-foreground"
          >
            ← Switch to daily planning
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Custom Weekly Planner
  return (
    <Card className={`border-primary/20 bg-gradient-to-r from-primary/5 to-secondary/5 ${className}`}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Calendar className="h-5 w-5 text-primary" />
          Custom Weekly Schedule
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Set your commitment for each day of the week.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Day-by-day sliders */}
        <div className="space-y-3">
          {(Object.keys(dayLabels) as Array<keyof DailyBudget>).map((day) => (
            <div key={day} className="flex items-center justify-between">
              <Label className="w-12 text-sm font-medium">
                {dayLabels[day]}
              </Label>
              <div className="flex items-center gap-3 flex-1">
                <Slider
                  value={[dailyBudget[day]]}
                  onValueChange={(value) => handleDayChange(day, value[0])}
                  max={8}
                  min={0}
                  step={1}
                  className="flex-1"
                />
                <span className="w-12 text-sm font-semibold text-right">
                  {dailyBudget[day]}h
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Weekly Summary */}
        <div className="bg-primary/5 rounded-lg p-3 text-center border border-primary/10">
          <p className="text-sm text-muted-foreground">Total per week</p>
          <p className="text-lg font-semibold text-primary">
            {calculateTotalWeeklyHours(dailyBudget)} hours
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setCommitmentType("weekly")}
            className="flex-1"
          >
            Switch to weekly goal
          </Button>
          <Button
            onClick={handleCustomConfirm}
            className="flex-1"
          >
            That's My Schedule!
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default CommitmentProfileUI;