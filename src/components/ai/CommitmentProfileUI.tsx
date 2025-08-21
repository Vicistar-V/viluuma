import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Clock, Calendar, Sparkles } from "lucide-react";

interface DailyBudget {
  mon: number;
  tue: number;
  wed: number;
  thu: number;
  fri: number;
  sat: number;
  sun: number;
}

interface CommitmentData {
  type: "daily" | "weekly";
  dailyBudget: DailyBudget;
  totalHoursPerWeek: number;
}

interface CommitmentProfileUIProps {
  onCommitmentSet: (commitment: CommitmentData) => void;
  className?: string;
}

const CommitmentProfileUI = ({ onCommitmentSet, className = "" }: CommitmentProfileUIProps) => {
  const [selectedHours, setSelectedHours] = useState(2);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [dailyBudget, setDailyBudget] = useState<DailyBudget>({
    mon: 2, tue: 2, wed: 2, thu: 2, fri: 2, sat: 0, sun: 0
  });

  const hourOptions = [
    { value: 1, label: "1 hr", description: "Light commitment" },
    { value: 2, label: "2 hrs", description: "Steady progress" },
    { value: 4, label: "4 hrs", description: "Intensive focus" },
  ];

  const handleQuickSelect = (hours: number) => {
    setSelectedHours(hours);
    // Update daily budget for weekdays only (default: M-F work schedule)
    const newDailyBudget: DailyBudget = {
      mon: hours, tue: hours, wed: hours, thu: hours, fri: hours,
      sat: 0, sun: 0
    };
    setDailyBudget(newDailyBudget);
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

  const handleConfirm = () => {
    const commitment: CommitmentData = {
      type: showAdvanced ? "daily" : "daily", // Always use daily type for more precision
      dailyBudget,
      totalHoursPerWeek: calculateTotalWeeklyHours(dailyBudget)
    };
    onCommitmentSet(commitment);
  };

  const dayLabels = {
    mon: "Mon", tue: "Tue", wed: "Wed", thu: "Thu", 
    fri: "Fri", sat: "Sat", sun: "Sun"
  };

  return (
    <>
      <Card className={`border-primary/20 bg-gradient-to-r from-primary/5 to-secondary/5 ${className}`}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Clock className="h-5 w-5 text-primary" />
            Your Time Commitment
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Be realistic! Consistency is more important than intensity.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Quick Hour Selection */}
          <div className="grid grid-cols-3 gap-2">
            {hourOptions.map((option) => (
              <Button
                key={option.value}
                variant={selectedHours === option.value ? "default" : "outline"}
                className="flex flex-col h-auto py-3 px-2"
                onClick={() => handleQuickSelect(option.value)}
              >
                <span className="font-semibold">{option.label}</span>
                <span className="text-xs opacity-80">{option.description}</span>
              </Button>
            ))}
          </div>

          {/* Custom Slider */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Custom Amount</Label>
              <span className="text-sm font-semibold text-primary">{selectedHours} hours/day</span>
            </div>
            <Slider
              value={[selectedHours]}
              onValueChange={handleCustomSlider}
              max={8}
              min={1}
              step={1}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>1 hr</span>
              <span>8 hrs</span>
            </div>
          </div>

          {/* Advanced Customization Link */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowAdvanced(true)}
            className="w-full text-primary hover:text-primary-foreground hover:bg-primary/10"
          >
            <Sparkles className="h-4 w-4 mr-2" />
            Customize by Day of the Week
          </Button>

          {/* Weekly Summary */}
          <div className="bg-muted/30 rounded-lg p-3 text-center">
            <p className="text-sm text-muted-foreground">Weekly Total</p>
            <p className="text-lg font-semibold">
              {calculateTotalWeeklyHours(dailyBudget)} hours/week
            </p>
          </div>

          {/* Confirm Button */}
          <Button
            onClick={handleConfirm}
            className="w-full"
            size="lg"
          >
            That's My Commitment!
          </Button>
        </CardContent>
      </Card>

      {/* Advanced Weekly Planner Modal */}
      <Dialog open={showAdvanced} onOpenChange={setShowAdvanced}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Weekly Schedule
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              Customize your daily commitment for each day of the week.
            </p>
            
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

            <div className="bg-primary/5 rounded-lg p-3 text-center border border-primary/10">
              <p className="text-sm text-muted-foreground">Total per week</p>
              <p className="text-lg font-semibold text-primary">
                {calculateTotalWeeklyHours(dailyBudget)} hours
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => setShowAdvanced(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button 
              onClick={() => {
                setShowAdvanced(false);
                // Update selected hours to reflect the average for display
                const weekdayHours = (dailyBudget.mon + dailyBudget.tue + dailyBudget.wed + dailyBudget.thu + dailyBudget.fri) / 5;
                setSelectedHours(Math.round(weekdayHours));
              }}
              className="flex-1"
            >
              Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default CommitmentProfileUI;