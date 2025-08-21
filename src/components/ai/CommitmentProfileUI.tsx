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
  const [commitmentType, setCommitmentType] = useState<"weekly" | "custom" | null>(null);
  const [selectedHours, setSelectedHours] = useState(2);
  const [dailyBudget, setDailyBudget] = useState<DailyBudget>({
    mon: 2, tue: 2, wed: 2, thu: 2, fri: 2, sat: 0, sun: 0
  });

  const weeklyOptions = [
    { value: 5, label: "5 hrs", description: "Light commitment", perDay: "~1hr/day" },
    { value: 10, label: "10 hrs", description: "Steady progress", perDay: "~2hrs/day" },
    { value: 20, label: "20 hrs", description: "Intensive focus", perDay: "~4hrs/day" },
    { value: 40, label: "40 hrs", description: "Full dedication", perDay: "~8hrs/day" },
  ];

  const handleWeeklyChoice = () => {
    setCommitmentType("weekly");
  };

  const handleCustomChoice = () => {
    setCommitmentType("custom");
  };

  const handleWeeklySelect = (totalHours: number) => {
    const hoursPerDay = Math.round(totalHours / 5); // Distribute across weekdays
    const newDailyBudget: DailyBudget = {
      mon: hoursPerDay, tue: hoursPerDay, wed: hoursPerDay, thu: hoursPerDay, fri: hoursPerDay,
      sat: 0, sun: 0
    };
    setDailyBudget(newDailyBudget);
    
    const commitment: CommitmentData = {
      type: "daily",
      dailyBudget: newDailyBudget,
      totalHoursPerWeek: totalHours
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

  // Initial Choice Screen
  if (!commitmentType) {
    return (
      <Card className={`border-primary/20 bg-gradient-to-r from-primary/5 to-secondary/5 ${className}`}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Clock className="h-5 w-5 text-primary" />
            Your Time Commitment
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            How would you like to set up your weekly schedule?
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Choice Buttons */}
          <div className="grid grid-cols-1 gap-3">
            <Button
              variant="outline"
              onClick={handleWeeklyChoice}
              className="flex items-center justify-start gap-3 h-auto py-4 px-4 text-left hover:bg-primary/5 hover:border-primary/30"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <Clock className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="font-semibold">⏰ A Weekly Goal</p>
                <p className="text-sm text-muted-foreground">Simple total hours per week</p>
              </div>
            </Button>

            <Button
              variant="outline"
              onClick={handleCustomChoice}
              className="flex items-center justify-start gap-3 h-auto py-4 px-4 text-left hover:bg-secondary/5 hover:border-secondary/30"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary/10">
                <CalendarDays className="h-5 w-5 text-secondary-foreground" />
              </div>
              <div className="flex-1">
                <p className="font-semibold">🗓️ Customize My Week</p>
                <p className="text-sm text-muted-foreground">Set hours for each day individually</p>
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Weekly Goal Selection
  if (commitmentType === "weekly") {
    return (
      <Card className={`border-primary/20 bg-gradient-to-r from-primary/5 to-secondary/5 ${className}`}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Clock className="h-5 w-5 text-primary" />
            Weekly Time Goal
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Pick a total that feels realistic and sustainable.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Weekly Options */}
          <div className="grid grid-cols-2 gap-3">
            {weeklyOptions.map((option) => (
              <Button
                key={option.value}
                variant="outline"
                className="flex flex-col h-auto py-4 px-3 hover:bg-primary/5 hover:border-primary/30"
                onClick={() => handleWeeklySelect(option.value)}
              >
                <span className="font-semibold text-lg">{option.label}</span>
                <span className="text-xs opacity-80">{option.description}</span>
                <span className="text-xs text-primary font-medium">{option.perDay}</span>
              </Button>
            ))}
          </div>

          {/* Back Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCommitmentType(null)}
            className="w-full text-muted-foreground hover:text-foreground"
          >
            ← Back to options
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
            onClick={() => setCommitmentType(null)}
            className="flex-1"
          >
            ← Back
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