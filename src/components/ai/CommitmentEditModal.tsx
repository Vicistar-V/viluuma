import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Clock } from "lucide-react";
import { DailyBudget, UserConstraints } from "@/types/onboarding";

interface CommitmentEditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userConstraints: UserConstraints;
  onSave: (updatedConstraints: UserConstraints) => void;
}

const CommitmentEditModal = ({ 
  open, 
  onOpenChange, 
  userConstraints, 
  onSave 
}: CommitmentEditModalProps) => {
  const [editedConstraints, setEditedConstraints] = useState<UserConstraints>(userConstraints);
  const [dailyBudget, setDailyBudget] = useState<DailyBudget>(
    userConstraints.dailyBudget || {
      mon: Math.round(userConstraints.hoursPerWeek / 5),
      tue: Math.round(userConstraints.hoursPerWeek / 5),
      wed: Math.round(userConstraints.hoursPerWeek / 5),
      thu: Math.round(userConstraints.hoursPerWeek / 5),
      fri: Math.round(userConstraints.hoursPerWeek / 5),
      sat: 0,
      sun: 0
    }
  );

  const dayLabels = {
    mon: "Mon", tue: "Tue", wed: "Wed", thu: "Thu", 
    fri: "Fri", sat: "Sat", sun: "Sun"
  };

  const handleDayChange = (day: keyof DailyBudget, hours: number) => {
    setDailyBudget(prev => ({ ...prev, [day]: hours }));
  };

  const calculateTotalWeeklyHours = (budget: DailyBudget): number => {
    return Object.values(budget).reduce((sum, hours) => sum + hours, 0);
  };

  const handleSave = () => {
    const totalHours = calculateTotalWeeklyHours(dailyBudget);
    const updatedConstraints: UserConstraints = {
      ...editedConstraints,
      hoursPerWeek: totalHours,
      dailyBudget: dailyBudget
    };
    
    onSave(updatedConstraints);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Edit Time Commitment
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
            onClick={() => onOpenChange(false)}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSave}
            className="flex-1"
          >
            Update Commitment
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CommitmentEditModal;